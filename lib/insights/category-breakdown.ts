import type { Transaction } from '@/lib/domain/transaction.types';
import { getCategoryById } from '@/lib/data/transaction-categories';

import {
  filterTransactionsInMonth,
  getDayOfMonth,
  monthKey,
  previousMonthKey,
} from './month-utils';

export type CategoryBreakdownItem = {
  key: string;
  label: string;
  icon: ReturnType<typeof getCategoryById> extends infer T ? T extends { icon: infer I } ? I : never : never;
  amount: number;
  percent: number;
  changePercent: number | null;
};

export function computeCategoryBreakdown(
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): CategoryBreakdownItem[] {
  const currentKey = monthKey(referenceDate);
  const prevKey = previousMonthKey(currentKey);
  const current = filterTransactionsInMonth(transactions, currentKey, referenceDate);
  const prev = filterTransactionsInMonth(transactions, prevKey, referenceDate);

  const totals = new Map<string, { amount: number; label: string }>();
  const prevTotals = new Map<string, number>();

  for (const tx of prev) {
    if (tx.type !== 'expense') continue;
    prevTotals.set(tx.category, (prevTotals.get(tx.category) ?? 0) + tx.amount);
  }

  for (const tx of current) {
    if (tx.type !== 'expense') continue;
    const row = totals.get(tx.category) ?? { amount: 0, label: tx.categoryLabel };
    row.amount += tx.amount;
    totals.set(tx.category, row);
  }

  const grandTotal = [...totals.values()].reduce((s, t) => s + t.amount, 0);
  if (grandTotal <= 0) return [];

  return [...totals.entries()]
    .map(([key, row]) => {
      const prevAmount = prevTotals.get(key) ?? 0;
      let changePercent: number | null = null;
      if (prevAmount > 0) {
        changePercent = Math.round(((row.amount - prevAmount) / prevAmount) * 100);
      }
      const cat = getCategoryById(key, 'expense');
      return {
        key,
        label: row.label,
        icon: cat?.icon ?? { ios: 'tag.fill', android: 'label', web: 'label' },
        amount: row.amount,
        percent: (row.amount / grandTotal) * 100,
        changePercent,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export type HeatmapDay = {
  date: string;
  day: number;
  amount: number;
  level: 'future' | 'none' | 'low' | 'medium' | 'high' | 'veryHigh';
  isFuture: boolean;
  isToday: boolean;
};

export function computeSpendingHeatmap(
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): { year: number; month: number; monthLabel: string; days: HeatmapDay[] } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const monthLabel = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(
    referenceDate,
  );
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = referenceDate.getDate();
  const todayMonth = referenceDate.getMonth();
  const todayYear = referenceDate.getFullYear();
  const isViewingCurrentMonth = year === todayYear && month === todayMonth;

  const byDay = new Map<number, number>();
  const key = monthKey(referenceDate);
  const monthTxs = filterTransactionsInMonth(transactions, key, referenceDate);
  for (const tx of monthTxs) {
    if (tx.type !== 'expense') continue;
    const day = getDayOfMonth(tx.date);
    byDay.set(day, (byDay.get(day) ?? 0) + tx.amount);
  }

  const days: HeatmapDay[] = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const isFuture = isViewingCurrentMonth && d > today;
    const isToday = isViewingCurrentMonth && d === today;
    const amount = byDay.get(d) ?? 0;
    days.push({
      date: `${key}-${String(d).padStart(2, '0')}`,
      day: d,
      amount,
      level: isFuture ? 'future' : heatLevel(amount),
      isFuture,
      isToday,
    });
  }

  return { year, month, monthLabel, days };
}

function heatLevel(amount: number): HeatmapDay['level'] {
  if (amount <= 0) return 'none';
  if (amount < 10) return 'low';
  if (amount <= 50) return 'medium';
  if (amount <= 150) return 'high';
  return 'veryHigh';
}

export function filterTransactionsByCategoryAndMonth(
  transactions: Transaction[],
  categoryKey: string,
  yearMonth: string,
  referenceDate: Date = new Date(),
): Transaction[] {
  return filterTransactionsInMonth(transactions, yearMonth, referenceDate).filter(
    (tx) => tx.type === 'expense' && tx.category === categoryKey,
  );
}

export function filterTransactionsByDate(
  transactions: Transaction[],
  date: string,
): Transaction[] {
  return transactions.filter((tx) => tx.date.slice(0, 10) === date.slice(0, 10));
}
