import type { Transaction } from '@/lib/domain/transaction.types';

import { filterTransactionsInMonth, monthKey, daysInMonth, sumByType } from './month-utils';

export type MonthSpendingForecast = {
  spentSoFar: number;
  daysPassed: number;
  daysTotal: number;
  projectedTotal: number;
  estimatedRemainingBudget: number | null;
  monthLabel: string;
};

export function computeMonthSpendingForecast(
  transactions: Transaction[],
  monthlyIncome: number,
  monthlyBudget?: number | null,
  referenceDate: Date = new Date(),
): MonthSpendingForecast | null {
  const currentKey = monthKey(referenceDate);
  const monthTxs = filterTransactionsInMonth(transactions, currentKey, referenceDate);
  const expenses = sumByType(monthTxs, 'expense');

  const day = referenceDate.getDate();
  const totalDays = daysInMonth(referenceDate.getFullYear(), referenceDate.getMonth());
  if (day <= 0) return null;

  const projectedTotal = (expenses / day) * totalDays;
  const budgetBase = monthlyBudget ?? monthlyIncome;
  const estimatedRemainingBudget =
    budgetBase > 0 ? Math.round((budgetBase - projectedTotal) * 100) / 100 : null;

  const monthLabel = new Intl.DateTimeFormat('pt-PT', { month: 'long' }).format(referenceDate);

  return {
    spentSoFar: expenses,
    daysPassed: day,
    daysTotal: totalDays,
    projectedTotal: Math.round(projectedTotal * 100) / 100,
    estimatedRemainingBudget,
    monthLabel,
  };
}
