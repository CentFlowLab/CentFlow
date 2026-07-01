import type { Transaction } from '@/lib/domain/transaction.types';

import type { FinancialPeriod } from './dates';
import { addMoney, roundMoney, subtractMoney } from './money';
import {
  countsAsBudgetExpense,
  countsAsBudgetIncome,
  countsAsCalendarSpending,
  countsAsCalendarSpendingReduction,
  resolveTransactionKind,
  type LedgerTransactionKind,
  type TransactionLike,
} from './transaction-kind';
import { filterTransactionsByPeriod } from './transactions';

export type LedgerImpact = {
  budgetExpenseDelta: number;
  budgetIncomeDelta: number;
  accountDelta: number;
  creditCardDebtDelta: number;
  countsAsExpense: boolean;
  countsAsIncome: boolean;
};

export function calculateBudgetImpact(tx: TransactionLike): Pick<
  LedgerImpact,
  'budgetExpenseDelta' | 'budgetIncomeDelta' | 'countsAsExpense' | 'countsAsIncome'
> {
  const kind = resolveTransactionKind(tx);
  const amount = tx.amount ?? 0;

  switch (kind) {
    case 'expense':
    case 'credit_card_purchase':
      return {
        budgetExpenseDelta: amount,
        budgetIncomeDelta: 0,
        countsAsExpense: true,
        countsAsIncome: false,
      };
    case 'credit_card_refund':
      return {
        budgetExpenseDelta: -amount,
        budgetIncomeDelta: 0,
        countsAsExpense: false,
        countsAsIncome: false,
      };
    case 'income':
      return {
        budgetExpenseDelta: 0,
        budgetIncomeDelta: amount,
        countsAsExpense: false,
        countsAsIncome: true,
      };
    default:
      return {
        budgetExpenseDelta: 0,
        budgetIncomeDelta: 0,
        countsAsExpense: false,
        countsAsIncome: false,
      };
  }
}

export function calculateAccountImpact(
  tx: TransactionLike,
  accountId: string,
): number {
  const kind = resolveTransactionKind(tx);
  const amount = tx.amount ?? 0;
  if (tx.accountId !== accountId) return 0;

  switch (kind) {
    case 'income':
      return amount;
    case 'expense':
    case 'credit_card_payment':
      return -amount;
    case 'transfer':
      return -amount;
    case 'credit_card_purchase':
    case 'credit_card_refund':
      return 0;
    default:
      return 0;
  }
}

export function calculateCreditCardImpact(
  tx: TransactionLike,
  creditId: string,
): number {
  if (tx.creditId !== creditId) return 0;
  const kind = resolveTransactionKind(tx);
  const amount = tx.amount ?? 0;

  switch (kind) {
    case 'credit_card_purchase':
      return amount;
    case 'credit_card_payment':
    case 'credit_card_refund':
      return -amount;
    default:
      if (kind === 'expense') return amount;
      return 0;
  }
}

export function calculateCreditCardDebt(
  credit: { id: string; outstandingBalance: number },
  transactions: TransactionLike[],
): number {
  const fromLedger = transactions.reduce(
    (sum, tx) => addMoney(sum, calculateCreditCardImpact(tx, credit.id)),
    credit.outstandingBalance,
  );
  return roundMoney(Math.max(0, fromLedger));
}

export function calculateRefundImpact(
  refund: TransactionLike,
  original?: TransactionLike | null,
): {
  netExpenseReduction: number;
  creditDebtReduction: number;
  incomeDelta: number;
} {
  const kind = resolveTransactionKind(refund);
  const refundAmount = refund.amount ?? 0;
  const base = {
    netExpenseReduction: 0,
    creditDebtReduction: 0,
    incomeDelta: 0,
  };

  if (kind === 'credit_card_refund') {
    base.creditDebtReduction = refundAmount;
    if (original && countsAsBudgetExpense(original)) {
      base.netExpenseReduction = Math.min(refundAmount, original.amount ?? 0);
    } else {
      base.netExpenseReduction = refundAmount;
    }
    return base;
  }

  if (kind === 'income' && refund.category === 'refund') {
    base.incomeDelta = refundAmount;
    return base;
  }

  return base;
}

export function calculateNetSpending(
  transactions: TransactionLike[],
  period: FinancialPeriod,
): number {
  return roundMoney(
    filterTransactionsByPeriod(transactions as Transaction[], period).reduce((sum, tx) => {
      const impact = calculateBudgetImpact(tx);
      return addMoney(sum, impact.budgetExpenseDelta);
    }, 0),
  );
}

export function calculateMonthlyBudget(
  transactions: TransactionLike[],
  period: FinancialPeriod,
): {
  income: number;
  expenses: number;
  net: number;
} {
  const inPeriod = filterTransactionsByPeriod(transactions as Transaction[], period);
  let income = 0;
  let expenses = 0;

  for (const tx of inPeriod) {
    const impact = calculateBudgetImpact(tx);
    income = addMoney(income, impact.budgetIncomeDelta);
    expenses = addMoney(expenses, impact.budgetExpenseDelta);
  }

  return {
    income: roundMoney(income),
    expenses: roundMoney(Math.max(0, expenses)),
    net: roundMoney(subtractMoney(income, Math.max(0, expenses))),
  };
}

export function getExpenseTotalFromLedger(
  transactions: TransactionLike[],
  period: FinancialPeriod,
): number {
  return calculateNetSpending(transactions, period);
}

export function getIncomeTotalFromLedger(
  transactions: TransactionLike[],
  period: FinancialPeriod,
): number {
  return roundMoney(
    filterTransactionsByPeriod(transactions as Transaction[], period)
      .filter(countsAsBudgetIncome)
      .reduce((sum, tx) => addMoney(sum, tx.amount), 0),
  );
}

export function ledgerKindLabel(kind: LedgerTransactionKind): string {
  const labels: Record<LedgerTransactionKind, string> = {
    income: 'Receita',
    expense: 'Despesa',
    transfer: 'Transferência',
    credit_card_purchase: 'Compra no cartão',
    credit_card_payment: 'Pagamento de cartão',
    credit_card_refund: 'Reembolso no cartão',
    balance_adjustment: 'Ajuste de saldo',
  };
  return labels[kind];
}

export { countsAsCalendarSpending, countsAsCalendarSpendingReduction };
