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

function occurredInCalendarMonth(tx: Transaction, referenceDate: Date): boolean {
  if (tx.type === 'transfer') return false;
  if (!isTransactionOccurred(tx.date, referenceDate)) return false;
  return isSameCalendarMonth(parseTransactionDate(tx.date), referenceDate);
}

function futureInCalendarMonth(tx: Transaction, referenceDate: Date): boolean {
  if (tx.type === 'transfer') return false;
  if (!isTransactionFuture(tx.date, referenceDate)) return false;
  return isSameCalendarMonth(parseTransactionDate(tx.date), referenceDate);
}

/** @deprecated alias — receitas e despesas usam mês civil da data do movimento. */
export const expenseCountsForBudgetMonth = occurredInCalendarMonth;
export const incomeCountsForBudgetMonth = occurredInCalendarMonth;
export const futureExpenseCountsForBudgetMonth = futureInCalendarMonth;
export const futureIncomeCountsForBudgetMonth = futureInCalendarMonth;

export function toSpendableMovement(tx: Transaction): SpendableMovement | null {
  if (tx.type === 'transfer') return null;
  return { type: tx.type, amount: tx.amount, date: tx.date };
}

export function filterOccurredForBudgetMonth(
  transactions: Transaction[],
  referenceDate: Date,
): SpendableMovement[] {
  return transactions
    .filter((tx) => occurredInCalendarMonth(tx, referenceDate))
    .map(toSpendableMovement)
    .filter((m): m is SpendableMovement => m !== null);
}

export function filterFutureForBudgetMonth(
  transactions: Transaction[],
  referenceDate: Date,
): SpendableMovement[] {
  return transactions
    .filter((tx) => futureInCalendarMonth(tx, referenceDate))
    .map(toSpendableMovement)
    .filter((m): m is SpendableMovement => m !== null);
}
