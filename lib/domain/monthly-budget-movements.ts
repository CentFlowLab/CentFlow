import { formatBudgetMonth, resolveTransactionBudgetMonth } from '@/lib/domain/budget-month';
import {
  isTransactionFuture,
  isTransactionOccurred,
  parseTransactionDate,
} from '@/lib/domain/transaction-date.utils';
import type { Transaction } from '@/lib/domain/transaction.types';
import type { SpendableMovement } from '@/lib/budget/calculateMonthlySpendable';

function isSameCalendarMonth(date: Date, reference: Date): boolean {
  return (
    date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth()
  );
}

function referenceBudgetMonth(reference: Date): string {
  return formatBudgetMonth(reference);
}

/** Despesa conta no mês civil da data do movimento. */
export function expenseCountsForBudgetMonth(tx: Transaction, referenceDate: Date): boolean {
  if (tx.type !== 'expense') return false;
  if (!isTransactionOccurred(tx.date, referenceDate)) return false;
  return isSameCalendarMonth(parseTransactionDate(tx.date), referenceDate);
}

/** Receita conta no mês financeiro (budget_month ou mês da data). */
export function incomeCountsForBudgetMonth(tx: Transaction, referenceDate: Date): boolean {
  if (tx.type !== 'income') return false;
  if (!isTransactionOccurred(tx.date, referenceDate)) return false;
  return resolveTransactionBudgetMonth(tx) === referenceBudgetMonth(referenceDate);
}

/** Receita futura com mês financeiro alinhado ao mês de referência. */
export function futureIncomeCountsForBudgetMonth(tx: Transaction, referenceDate: Date): boolean {
  if (tx.type !== 'income') return false;
  if (!isTransactionFuture(tx.date, referenceDate)) return false;
  return resolveTransactionBudgetMonth(tx) === referenceBudgetMonth(referenceDate);
}

/** Despesa futura no mês civil de referência. */
export function futureExpenseCountsForBudgetMonth(tx: Transaction, referenceDate: Date): boolean {
  if (tx.type !== 'expense') return false;
  if (!isTransactionFuture(tx.date, referenceDate)) return false;
  return isSameCalendarMonth(parseTransactionDate(tx.date), referenceDate);
}

export function toSpendableMovement(tx: Transaction): SpendableMovement | null {
  if (tx.type === 'transfer') return null;
  return { type: tx.type, amount: tx.amount, date: tx.date };
}

export function filterOccurredForBudgetMonth(
  transactions: Transaction[],
  referenceDate: Date,
): SpendableMovement[] {
  return transactions
    .filter((tx) => expenseCountsForBudgetMonth(tx, referenceDate) || incomeCountsForBudgetMonth(tx, referenceDate))
    .map(toSpendableMovement)
    .filter((m): m is SpendableMovement => m !== null);
}

export function filterFutureForBudgetMonth(
  transactions: Transaction[],
  referenceDate: Date,
): SpendableMovement[] {
  return transactions
    .filter(
      (tx) =>
        futureExpenseCountsForBudgetMonth(tx, referenceDate) ||
        futureIncomeCountsForBudgetMonth(tx, referenceDate),
    )
    .map(toSpendableMovement)
    .filter((m): m is SpendableMovement => m !== null);
}
