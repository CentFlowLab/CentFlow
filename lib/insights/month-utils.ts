import type { Transaction } from '@/lib/domain/transaction.types';
import { isTransactionOccurred, parseTransactionDate } from '@/lib/domain/transaction-date.utils';

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function previousMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y!, (m ?? 1) - 2, 1);
  return monthKey(d);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function filterTransactionsInMonth(
  transactions: Transaction[],
  yearMonth: string,
  asOf?: Date,
): Transaction[] {
  return transactions.filter((tx) => {
    if (asOf && !isTransactionOccurred(tx.date, asOf)) return false;
    return tx.date.slice(0, 7) === yearMonth;
  });
}

export function sumByType(
  transactions: Transaction[],
  type: 'expense' | 'income',
): number {
  return transactions
    .filter((tx) => tx.type === type)
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function formatMonthLabelPt(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y!, (m ?? 1) - 1, 1);
  return new Intl.DateTimeFormat('pt-PT', { month: 'long' }).format(d);
}

export function formatMonthShortPt(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y!, (m ?? 1) - 1, 1);
  return new Intl.DateTimeFormat('pt-PT', { month: 'short' }).format(d);
}

export function getDayOfMonth(dateStr: string): number {
  return parseTransactionDate(dateStr).getDate();
}
