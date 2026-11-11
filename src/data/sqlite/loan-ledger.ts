import { loanState, recordValuation, ValidationError, type LoanLedgerEntry } from '@/core/finance';

import type { SqlExecutor } from '../db/sql-database';
import type { SqliteRepositoryContext } from './context';
import { parseHistory, serializeHistory } from './wealth-history';

type LoanRow = {
  id: string;
  amount: number;
  currency: string;
  valued_on: string;
  value_history: string | null;
  closed_on: string | null;
  principal_amount: number | null;
  opening_debt: number | null;
  opening_on: string | null;
};

type LedgerRow = {
  id: string;
  type: LoanLedgerEntry['type'];
  amount: number;
  date: string;
  account_id: string;
  description: string;
  loan_role: LoanLedgerEntry['loanRole'];
  principal_amount: number | null;
  interest_amount: number | null;
  fees_amount: number | null;
};

/** Movimentos ativos ligados a um empréstimo, no formato do `core`. */
export async function loanLedger(tx: SqlExecutor, loanId: string): Promise<LoanLedgerEntry[]> {
  const rows = await tx.all<LedgerRow>(
    `SELECT id, type, amount, date, account_id, description, loan_role, principal_amount,
       interest_amount, fees_amount
       FROM entries WHERE loan_id = ? AND deleted_at IS NULL`,
    [loanId],
  );
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    amount: row.amount,
    date: row.date,
    accountId: row.account_id,
    description: row.description,
    loanRole: row.loan_role,
    principalAmount: row.principal_amount,
    interestAmount: row.interest_amount,
    feesAmount: row.fees_amount,
  }));
}

/**
 * Dívida de um empréstimo antigo (sem abertura): passa a abertura = valor e data atuais, para
 * as prestações seguintes serem calculadas a partir daí (ADR-057).
 */
export async function ensureLoanOpening(
  tx: SqlExecutor,
  context: Pick<SqliteRepositoryContext, 'now'>,
  loanId: string,
): Promise<void> {
  await tx.run(
    `UPDATE wealth_items SET opening_debt = amount, opening_on = valued_on, updated_at = ?
      WHERE id = ? AND opening_debt IS NULL AND deleted_at IS NULL`,
    [context.now(), loanId],
  );
}

/**
 * Recalcula a dívida a partir da abertura e das prestações ligadas e guarda-a no item (com
 * histórico), na mesma transação da escrita que a mudou. A tabela não aceita 0: a zero, fica o
 * último valor e a dívida passa a paga nessa data; se voltar a haver dívida, reabre.
 */
export async function recomputeLoan(
  tx: SqlExecutor,
  context: Pick<SqliteRepositoryContext, 'now'>,
  loanId: string | null,
): Promise<void> {
  if (!loanId) return;
  const row = await tx.first<LoanRow>(
    `SELECT id, amount, currency, valued_on, value_history, closed_on, principal_amount,
       opening_debt, opening_on
       FROM wealth_items WHERE id = ? AND deleted_at IS NULL`,
    [loanId],
  );
  if (!row || row.opening_debt === null || row.opening_on === null) return;
  const ledger = await loanLedger(tx, loanId);
  const state = loanState(
    {
      openingDebt: row.opening_debt,
      openingOn: row.opening_on,
      principalAmount: row.principal_amount,
    },
    ledger,
  );
  if (!state) return;
  if (state.debt < 0) throw new ValidationError({ principalAmount: 'principalTooLarge' });
  const lastDate = ledger
    .map((entry) => entry.date)
    .filter((date) => date >= row.opening_on!)
    .reduce((latest, date) => (date > latest ? date : latest), row.opening_on);
  const before = {
    amount: row.amount,
    currency: row.currency,
    valuedOn: row.valued_on,
    valueHistory: parseHistory(row.value_history),
  };
  const paidOff = state.debt === 0;
  const next = paidOff
    ? { amount: row.amount, currency: row.currency, valuedOn: row.valued_on }
    : { amount: state.debt, currency: row.currency, valuedOn: lastDate };
  const closedOn = paidOff
    ? lastDate
    : row.closed_on && row.closed_on >= row.opening_on
      ? null
      : row.closed_on;
  if (next.amount === row.amount && next.valuedOn === row.valued_on && closedOn === row.closed_on) {
    return;
  }
  const valueHistory = recordValuation(before, next);
  await tx.run(
    `UPDATE wealth_items SET amount = ?, valued_on = ?, value_history = ?, closed_on = ?,
       updated_at = ? WHERE id = ?`,
    [next.amount, next.valuedOn, serializeHistory(valueHistory), closedOn, context.now(), loanId],
  );
}
