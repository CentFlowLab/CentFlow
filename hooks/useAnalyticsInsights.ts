import { useAssets } from '@/hooks/queries/useAssets';
import { useHomeScreenData } from '@/hooks/queries/useHomeScreenData';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { estimateMonthlyCashflow, monthlySubscriptionTotal } from '@/lib/domain/financial';
import { computeAnalyticsSnapshot } from '@/lib/insights/safe-analytics';
import type { HealthScoreInput, InsightInput } from '@/lib/insights/types';
import { filterTransactionsInMonth, monthKey } from '@/lib/insights/month-utils';
import { useMemo } from 'react';

function finiteNumber(value: number | null | undefined): number {
  const n = value ?? 0;
  return Number.isFinite(n) ? n : 0;
}

export function useAnalyticsInsights(referenceDate = new Date()) {
  const { data: transactions = [] } = useTransactions('all');
  const { data: liabilities } = useLiabilities();
  const { data: assets } = useAssets();
  const { data: home } = useHomeScreenData();
  const { data: onboarding } = useOnboardingAnswers();

  return useMemo(() => {
    const subscriptions = liabilities?.subscriptions ?? assets?.subscriptions ?? [];
    const credits = liabilities?.credits ?? assets?.credits ?? [];
    const goals = assets?.goals ?? [];
    const safeTransactions = transactions ?? [];

    const { income, expenses } = estimateMonthlyCashflow(safeTransactions, referenceDate);
    const monthlyIncome = finiteNumber(income);
    const monthlyExpenses = finiteNumber(expenses);
    const monthlySubscriptionCost = finiteNumber(monthlySubscriptionTotal(subscriptions));
    const totalDebt = (credits ?? []).reduce(
      (sum, c) => sum + finiteNumber(c.outstandingBalance),
      0,
    );
    const creditMonthlyPayments = (credits ?? []).reduce(
      (sum, c) => sum + finiteNumber(c.monthlyPayment ?? c.nextPaymentAmount),
      0,
    );

    const currentKey = monthKey(referenceDate);
    const monthTxCount = filterTransactionsInMonth(
      safeTransactions,
      currentKey,
      referenceDate,
    ).length;

    const monthlyBudget = onboarding?.monthlyIncome ?? null;

    const insightInput: InsightInput = {
      transactions: safeTransactions,
      subscriptions,
      credits,
      goals: (goals ?? []).map((g) => ({
        id: g.id,
        name: g.name ?? 'Objetivo',
        current: finiteNumber(g.current),
        target: finiteNumber(g.target),
      })),
      monthlyIncome,
      monthlyExpenses,
      monthlyBudget,
      netWorthChangePercent: home?.netWorthChangePercent,
      netWorthChangeAmount: home?.netWorthChangeThisMonth,
      referenceDate,
    };

    const healthInput: HealthScoreInput = {
      monthlyIncome,
      monthlyExpenses,
      monthlySubscriptionCost,
      monthlyBudget,
      totalDebt,
      creditMonthlyPayments,
      transactionCountThisMonth: monthTxCount,
    };

    return computeAnalyticsSnapshot({
      transactions: safeTransactions,
      subscriptions,
      credits,
      insightInput,
      healthInput,
      referenceDate,
      monthlyIncome,
      monthlyExpenses,
      monthlyBudget,
    });
  }, [assets, home, liabilities, onboarding, referenceDate, transactions]);
}
