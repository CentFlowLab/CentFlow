import {
  hasErrors,
  isLiabilityType,
  isValidCalendarDate,
  LOAN_FIELDS,
  recordValuation,
  splitPayment,
  validateWealthItemInput,
  validateWealthPayment,
  ValidationError,
  withOrigin,
  type LoanFields,
  type WealthItem,
  type WealthItemInput,
} from '@/core/finance';

import type { SqlExecutor } from '../db/sql-database';
import { NotFoundError } from '../errors';
import type { WealthRepository } from '../repositories/types';
import { insertAccount } from './account-repository';
import { write, type SqliteRepositoryContext } from './context';
import { insertEntry, prepareEntry } from './entry-repository';
import { ensureLoanOpening, loanLedger, recomputeLoan } from './loan-ledger';
import { parseHistory, serializeHistory } from './wealth-history';

type WealthRow = {
  id: string;
  name: string;
  type: WealthItem['type'];
  amount: number;
  currency: string;
  valued_on: string;
  value_history: string | null;
  closed_on: string | null;
  loan_kind: WealthItem['loanKind'];
  institution: string | null;
  principal_amount: number | null;
  started_on: string | null;
  opening_debt: number | null;
  opening_on: string | null;
  interest_rate_bp: number | null;
  installment_amount: number | null;
  due_day: number | null;
  ends_on: string | null;
  integration: WealthItem['integration'];
  created_at: string;
  updated_at: string;
};

const COLUMNS = `id, name, type, amount, currency, valued_on, value_history, closed_on, loan_kind,
  institution, principal_amount, started_on, opening_debt, opening_on, interest_rate_bp,
  installment_amount, due_day, ends_on, integration, created_at, updated_at`;

/** Colunas dos campos do empréstimo, pela ordem de `LOAN_FIELDS`. */
const LOAN_COLUMNS = [
  'loan_kind',
  'institution',
  'principal_amount',
  'started_on',
  'opening_debt',
  'opening_on',
  'interest_rate_bp',
  'installment_amount',
  'due_day',
  'ends_on',
] as const;

function toItem(row: WealthRow): WealthItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    valuedOn: row.valued_on,
    valueHistory: parseHistory(row.value_history),
    closedOn: row.closed_on,
    loanKind: row.loan_kind,
    institution: row.institution,
    principalAmount: row.principal_amount,
    startedOn: row.started_on,
    openingDebt: row.opening_debt,
    openingOn: row.opening_on,
    interestRateBp: row.interest_rate_bp,
    installmentAmount: row.installment_amount,
    dueDay: row.due_day,
    endsOn: row.ends_on,
    integration: row.integration ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Campos do empréstimo: ausentes no `raw` mantêm o guardado; só em dívidas (não cartões). */
function loanFields(raw: WealthItemInput, existing?: WealthItem): LoanFields {
  const fields = {} as Record<keyof LoanFields, unknown>;
  for (const key of LOAN_FIELDS) {
    const value = raw[key];
    fields[key] = value === undefined ? (existing?.[key] ?? null) : value;
  }
  if (!isLiabilityType(raw.type) || raw.type === 'credit') {
    for (const key of LOAN_FIELDS) fields[key] = null;
  }
  const institution = typeof fields.institution === 'string' ? fields.institution.trim() : null;
  fields.institution = institution === '' ? null : institution;
  return fields as LoanFields;
}

function prepare(raw: WealthItemInput, existing?: WealthItem) {
  const input = {
    name: raw.name.trim(),
    type: raw.type,
    amount: raw.amount,
    currency: raw.currency.trim().toUpperCase(),
    valuedOn: raw.valuedOn,
    ...loanFields(raw, existing),
    ...(raw.origin ? { origin: { amount: raw.origin.amount, valuedOn: raw.origin.valuedOn } } : {}),
  };
  // Empréstimo novo: a dívida de abertura é o valor em dívida na data indicada (ADR-057).
  if (
    !existing &&
    isLiabilityType(input.type) &&
    input.type !== 'credit' &&
    input.openingDebt === null
  ) {
    input.openingDebt = input.amount;
    input.openingOn = input.valuedOn;
  }
  const errors = validateWealthItemInput(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  return input;
}

async function findOpen(tx: SqlExecutor, id: string): Promise<WealthRow> {
  const row = await tx.first<WealthRow>(
    `SELECT ${COLUMNS} FROM wealth_items WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  if (!row) throw new NotFoundError('wealth_item', id);
  return row;
}

/** Campos guardados; a origem só existe no histórico. */
function stored({ origin: _origin, ...input }: ReturnType<typeof prepare>) {
  return input;
}

const loanValues = (input: LoanFields) => [
  input.loanKind,
  input.institution,
  input.principalAmount,
  input.startedOn,
  input.openingDebt,
  input.openingOn,
  input.interestRateBp,
  input.installmentAmount,
  input.dueDay,
  input.endsOn,
];

export function createSqliteWealthRepository(context: SqliteRepositoryContext): WealthRepository {
  const { db } = context;

  function setClosed(id: string, closedOn: string | null): Promise<WealthItem> {
    if (closedOn !== null && !isValidCalendarDate(closedOn)) {
      return Promise.reject(new ValidationError({ closedOn: 'invalidDate' }));
    }
    return write(context, ['wealth_items'], () =>
      db.transaction(async (tx) => {
        const existing = await findOpen(tx, id);
        const timestamp = context.now();
        await tx.run('UPDATE wealth_items SET closed_on = ?, updated_at = ? WHERE id = ?', [
          closedOn,
          timestamp,
          id,
        ]);
        return { ...toItem(existing), closedOn, updatedAt: timestamp };
      }),
    );
  }

  return {
    async list() {
      const rows = await db.all<WealthRow>(
        `SELECT ${COLUMNS} FROM wealth_items WHERE deleted_at IS NULL ORDER BY name, rowid`,
      );
      return rows.map(toItem);
    },

    async get(id) {
      const row = await db.first<WealthRow>(
        `SELECT ${COLUMNS} FROM wealth_items WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      return row ? toItem(row) : null;
    },

    create(raw) {
      return write(context, ['wealth_items'], () =>
        db.transaction(async (tx) => {
          const input = prepare(raw);
          const id = context.newId();
          const timestamp = context.now();
          const valueHistory = withOrigin([], input.origin);
          await tx.run(
            `INSERT INTO wealth_items (id, name, type, amount, currency, valued_on, value_history,
               ${LOAN_COLUMNS.join(', ')}, integration, created_at, updated_at)
             VALUES (${Array.from({ length: 7 + LOAN_COLUMNS.length + 3 }, () => '?').join(', ')})`,
            [
              id,
              input.name,
              input.type,
              input.amount,
              input.currency,
              input.valuedOn,
              serializeHistory(valueHistory),
              ...loanValues(input),
              raw.integration ?? null,
              timestamp,
              timestamp,
            ],
          );
          return {
            id,
            ...stored(input),
            valueHistory,
            closedOn: null,
            integration: raw.integration ?? null,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
        }),
      );
    },

    update(id, raw) {
      return write(context, ['wealth_items'], () =>
        db.transaction(async (tx) => {
          const before = toItem(await findOpen(tx, id));
          const input = prepare(raw, before);
          const timestamp = context.now();
          // Guarda a avaliação anterior (ou corrige a do mesmo dia) para o histórico do património.
          const valueHistory = withOrigin(recordValuation(before, input), input.origin);
          await tx.run(
            `UPDATE wealth_items
                SET name = ?, type = ?, amount = ?, currency = ?, valued_on = ?, value_history = ?,
                    ${LOAN_COLUMNS.map((column) => `${column} = ?`).join(', ')}, updated_at = ?
              WHERE id = ?`,
            [
              input.name,
              input.type,
              input.amount,
              input.currency,
              input.valuedOn,
              serializeHistory(valueHistory),
              ...loanValues(input),
              timestamp,
              id,
            ],
          );
          return { ...before, ...stored(input), valueHistory, updatedAt: timestamp };
        }),
      );
    },

    close(id, closedOn) {
      return setClosed(id, closedOn);
    },

    reopen(id) {
      return setClosed(id, null);
    },

    setIntegration(id, integration) {
      return write(context, ['wealth_items'], () =>
        db.transaction(async (tx) => {
          const before = toItem(await findOpen(tx, id));
          if (before.integration === integration) return before;
          const timestamp = context.now();
          await tx.run('UPDATE wealth_items SET integration = ?, updated_at = ? WHERE id = ?', [
            integration,
            timestamp,
            id,
          ]);
          return { ...before, integration, updatedAt: timestamp };
        }),
      );
    },

    delete(id) {
      return write(context, ['wealth_items', 'entries'], () =>
        db.transaction(async (tx) => {
          const timestamp = context.now();
          const { changes } = await tx.run(
            `UPDATE wealth_items SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
            [timestamp, timestamp, id],
          );
          if (changes === 0) throw new NotFoundError('wealth_item', id);
          // As prestações são dinheiro real: ficam, só perdem a ligação (como nos veículos).
          await tx.run(
            `UPDATE entries SET loan_id = NULL, loan_role = NULL, principal_amount = NULL,
               interest_amount = NULL, fees_amount = NULL, updated_at = ? WHERE loan_id = ?`,
            [timestamp, id],
          );
        }),
      );
    },

    recordPayment(id, payment) {
      return write(context, ['entries', 'wealth_items'], () =>
        db.transaction(async (tx) => {
          await ensureLoanOpening(tx, context, id);
          const before = toItem(await findOpen(tx, id));
          const errors = validateWealthPayment(payment, before);
          if (hasErrors(errors)) throw new ValidationError(errors);
          const split = splitPayment(
            payment.amount,
            payment.principal,
            payment.interest,
            payment.fees,
          );
          if (!split) throw new ValidationError({ principal: 'splitMismatch' });
          const entryInput = await prepareEntry(tx, {
            type: 'expense',
            amount: payment.amount,
            description: payment.description,
            categoryId: payment.categoryId,
            accountId: payment.accountId,
            destinationAccountId: null,
            date: payment.date,
            notes: null,
            loanId: id,
            loanRole: 'payment',
            principalAmount: split.principal,
            interestAmount: split.interest,
            feesAmount: split.fees,
          });
          const account = await tx.first<{ currency: string }>(
            'SELECT currency FROM accounts WHERE id = ?',
            [entryInput.accountId],
          );
          if (account?.currency !== before.currency) {
            throw new ValidationError({ accountId: 'currencyMismatch' });
          }
          const entry = await insertEntry(tx, context, entryInput);
          // A dívida é calculada pelas prestações ligadas (ADR-057).
          await recomputeLoan(tx, context, id);
          return { entry, item: toItem(await findOpen(tx, id)) };
        }),
      );
    },

    async loanLedger(id) {
      return db.transaction((tx) => loanLedger(tx, id));
    },

    moveCardToAccounts(id, today) {
      return write(context, ['accounts', 'wealth_items'], () =>
        db.transaction(async (tx) => {
          const item = toItem(await findOpen(tx, id));
          if (item.type !== 'credit' || item.closedOn) {
            throw new ValidationError({ type: 'notLiability' });
          }
          const account = await insertAccount(tx, context, {
            name: item.name,
            type: 'card',
            currency: item.currency,
            initialBalance: -item.amount,
          });
          await tx.run('UPDATE wealth_items SET closed_on = ?, updated_at = ? WHERE id = ?', [
            today,
            context.now(),
            id,
          ]);
          return account;
        }),
      );
    },
  };
}
