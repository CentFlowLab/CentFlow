import type { SpendableMovement } from '@/lib/budget/calculateMonthlySpendable';
import {
  filterFutureForMonthlyBudget,
  filterOccurredForMonthlyBudget,
  filterOccurredInCalendarMonth,
} from '@/lib/domain/financial/transactions';
import type { Transaction } from '@/lib/domain/transaction.types';

export function incomeCountsForBudgetMonth(tx: Transaction, referenceDate: Date): boolean {
  if (tx.type !== 'income') return false;
  return filterOccurredInCalendarMonth([tx], referenceDate).length > 0;
}

export function expenseCountsForBudgetMonth(tx: Transaction, referenceDate: Date): boolean {
  if (tx.type !== 'expense') return false;
  return filterOccurredInCalendarMonth([tx], referenceDate).length > 0;
}

export function filterOccurredForBudgetMonth(
  transactions: Transaction[],
  referenceDate: Date,
): SpendableMovement[] {
  return filterOccurredForMonthlyBudget(transactions, referenceDate);
}

export function filterFutureForBudgetMonth(
  transactions: Transaction[],
  referenceDate: Date,
): SpendableMovement[] {
  return filterFutureForMonthlyBudget(transactions, referenceDate);
}

export function toSpendableMovement(tx: Transaction): SpendableMovement | null {
  if (tx.type === 'transfer' || tx.type === 'credit_payment') return null;
  return { type: tx.type, amount: tx.amount, date: tx.date };
}
