import type { Transaction } from '@/lib/domain/transaction.types';

import {
  filterTransactionsInMonth,
  formatMonthShortPt,
  monthKey,
  previousMonthKey,
  sumByType,
} from './month-utils';

export type MonthlyComparisonRow = {
  key: 'expenses' | 'income' | 'savings';
  label: string;
  previous: number;
  current: number;
  changePercent: number | null;
};

export type MonthlyBar = {
  monthKey: string;
  label: string;
  amount: number;
  isAboveAverage: boolean;
};

export function computeMonthlyComparison(
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): {
  rows: MonthlyComparisonRow[];
  bars: MonthlyBar[];
  currentMonthLabel: string;
  previousMonthLabel: string;
} {
  const currentKey = monthKey(referenceDate);
  const prevKey = previousMonthKey(currentKey);

  const currentTxs = filterTransactionsInMonth(transactions, currentKey, referenceDate);
  const prevTxs = filterTransactionsInMonth(transactions, prevKey, referenceDate);

  const currentExpenses = sumByType(currentTxs, 'expense');
  const prevExpenses = sumByType(prevTxs, 'expense');
  const currentIncome = sumByType(currentTxs, 'income');
  const prevIncome = sumByType(prevTxs, 'income');
  const currentSavings = currentIncome - currentExpenses;
  const prevSavings = prevIncome - prevExpenses;

  const rows: MonthlyComparisonRow[] = [
    {
      key: 'expenses',
      label: 'Despesas',
      previous: prevExpenses,
      current: currentExpenses,
      changePercent: percentChange(prevExpenses, currentExpenses),
    },
    {
      key: 'income',
      label: 'Receitas',
      previous: prevIncome,
      current: currentIncome,
      changePercent: percentChange(prevIncome, currentIncome),
    },
    {
      key: 'savings',
      label: 'Poupança',
      previous: prevSavings,
      current: currentSavings,
      changePercent: percentChange(prevSavings, currentSavings),
    },
  ];

  const bars: MonthlyBar[] = [];
  const keys: string[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    keys.push(monthKey(d));
  }

  const amounts = keys.map((key) =>
    sumByType(filterTransactionsInMonth(transactions, key, referenceDate), 'expense'),
  );
  const avg = amounts.reduce((a, b) => a + b, 0) / Math.max(amounts.length, 1);

  for (let i = 0; i < keys.length; i += 1) {
    bars.push({
      monthKey: keys[i]!,
      label: formatMonthShortPt(keys[i]!),
      amount: amounts[i]!,
      isAboveAverage: amounts[i]! > avg,
    });
  }

  return {
    rows,
    bars,
    currentMonthLabel: formatMonthShortPt(currentKey),
    previousMonthLabel: formatMonthShortPt(prevKey),
  };
}

function percentChange(previous: number, current: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}
