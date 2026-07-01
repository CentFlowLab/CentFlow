import type { Transaction } from '@/lib/domain/transaction.types';
import { parseIsoDate } from './dates';
import { addMoney, roundMoney } from './money';
import {
  countsAsCalendarSpending,
  countsAsCalendarSpendingReduction,
  excludesFromCalendarSpending,
  resolveTransactionKind,
} from './transaction-kind';

export type SpendingDayCell = {
  dayKey: string;
  day: number;
  amount: number;
  movementCount: number;
  topCategory?: string;
  topCategoryLabel?: string;
  topMovement?: { description: string; amount: number };
  intensity: number;
};

export type SpendingDayDetail = {
  dayKey: string;
  total: number;
  movementCount: number;
  topCategory?: string;
  topCategoryLabel?: string;
  topMovement?: { description: string; amount: number };
};

function dayKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isInMonth(dateIso: string, monthKey: string): boolean {
  return dateIso.slice(0, 7) === monthKey;
}

/** Gasto líquido de um movimento para calendário (exclui pagamentos cartão e transferências). */
export function calendarSpendingDelta(tx: Pick<Transaction, 'type' | 'amount' | 'creditId' | 'category' | 'accountId'>): number {
  if (excludesFromCalendarSpending(tx)) return 0;
  if (countsAsCalendarSpendingReduction(tx)) return -tx.amount;
  if (countsAsCalendarSpending(tx)) return tx.amount;
  return 0;
}

export function buildSpendingCalendar(
  transactions: Transaction[],
  monthKey: string,
  asOf: Date = new Date(),
): SpendingDayCell[] {
  const byDay = new Map<string, { amount: number; txs: Transaction[] }>();

  for (const tx of transactions) {
    if (!isInMonth(tx.date, monthKey)) continue;
    const delta = calendarSpendingDelta(tx);
    if (delta === 0) continue;

    const key = tx.date.slice(0, 10);
    const bucket = byDay.get(key) ?? { amount: 0, txs: [] };
    bucket.amount = addMoney(bucket.amount, delta);
    bucket.txs.push(tx);
    byDay.set(key, bucket);
  }

  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  let maxAmount = 0;

  const cells: SpendingDayCell[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    const key = dayKeyFromDate(date);
    const bucket = byDay.get(key);
    const amount = roundMoney(Math.max(0, bucket?.amount ?? 0));
    if (amount > maxAmount) maxAmount = amount;

    const categoryTotals = new Map<string, { label: string; amount: number }>();
    for (const tx of bucket?.txs ?? []) {
      if (!countsAsCalendarSpending(tx) && !countsAsCalendarSpendingReduction(tx)) continue;
      const cat = tx.category;
      const current = categoryTotals.get(cat) ?? { label: tx.categoryLabel, amount: 0 };
      current.amount = addMoney(current.amount, Math.abs(calendarSpendingDelta(tx)));
      categoryTotals.set(cat, current);
    }
    const topCatEntry = [...categoryTotals.entries()].sort((a, b) => b[1].amount - a[1].amount)[0];
    const topTx = [...(bucket?.txs ?? [])]
      .filter((tx) => Math.abs(calendarSpendingDelta(tx)) > 0)
      .sort((a, b) => b.amount - a.amount)[0];

    cells.push({
      dayKey: key,
      day,
      amount,
      movementCount: bucket?.txs.length ?? 0,
      topCategory: topCatEntry?.[0],
      topCategoryLabel: topCatEntry?.[1].label,
      topMovement: topTx
        ? {
            description: topTx.description?.trim() || topTx.categoryLabel,
            amount: topTx.amount,
          }
        : undefined,
      intensity: 0,
    });
  }

  return cells.map((cell) => ({
    ...cell,
    intensity: maxAmount > 0 ? cell.amount / maxAmount : 0,
  }));
}

export function getSpendingDayDetail(
  transactions: Transaction[],
  dayKey: string,
): SpendingDayDetail {
  const dayTxs = transactions.filter((tx) => tx.date.slice(0, 10) === dayKey);
  let total = 0;
  const categoryTotals = new Map<string, { label: string; amount: number }>();

  for (const tx of dayTxs) {
    const delta = calendarSpendingDelta(tx);
    if (delta === 0) continue;
    total = addMoney(total, delta);
    const cat = tx.category;
    const current = categoryTotals.get(cat) ?? { label: tx.categoryLabel, amount: 0 };
    current.amount = addMoney(current.amount, Math.abs(delta));
    categoryTotals.set(cat, current);
  }

  const topCat = [...categoryTotals.entries()].sort((a, b) => b[1].amount - a[1].amount)[0];
  const topTx = dayTxs
    .filter((tx) => calendarSpendingDelta(tx) !== 0)
    .sort((a, b) => b.amount - a.amount)[0];

  return {
    dayKey,
    total: roundMoney(Math.max(0, total)),
    movementCount: dayTxs.filter((tx) => calendarSpendingDelta(tx) !== 0).length,
    topCategory: topCat?.[0],
    topCategoryLabel: topCat?.[1].label,
    topMovement: topTx
      ? { description: topTx.description?.trim() || topTx.categoryLabel, amount: topTx.amount }
      : undefined,
  };
}
