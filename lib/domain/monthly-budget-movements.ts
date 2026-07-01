import type { SpendableMovement } from '@/lib/budget/calculateMonthlySpendable';
import {
  filterFutureForMonthlyBudget,
  filterOccurredForMonthlyBudget,
  filterOccurredInCalendarMonth,
} from '@/lib/domain/financial/transactions';
import { countsAsBudgetExpense } from '@/lib/domain/financial/transaction-kind';
import { resolveTransactionKind } from '@/lib/domain/financial/transaction-kind';
import type { Transaction } from '@/lib/domain/transaction.types';

export function incomeCountsForBudgetMonth(tx: Transaction, referenceDate: Date): boolean {
  if (tx.type !== 'income') return false;
  return filterOccurredInCalendarMonth([tx], referenceDate).length > 0;
}

export function expenseCountsForBudgetMonth(tx: Transaction, referenceDate: Date): boolean {
  if (!countsAsBudgetExpense(tx)) return false;
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
  const kind = resolveTransactionKind(tx);
  if (
    kind === 'transfer' ||
    kind === 'credit_card_payment' ||
    kind === 'credit_card_refund' ||
    kind === 'balance_adjustment'
  ) {
    return null;
  }
  if (kind === 'credit_card_purchase') {
    return { type: 'expense', amount: tx.amount, date: tx.date };
  }
  if (kind === 'income' || kind === 'expense') {
    return { type: kind, amount: tx.amount, date: tx.date };
  }
  return null;
}
