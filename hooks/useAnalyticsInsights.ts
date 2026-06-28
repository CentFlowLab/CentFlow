import { useAssets } from '@/hooks/queries/useAssets';
import { useHomeScreenData } from '@/hooks/queries/useHomeScreenData';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { estimateMonthlyCashflow, monthlySubscriptionTotal } from '@/lib/domain/financial';
import { calculateHealthScore } from '@/lib/insights/health-score';
import { generateInsights } from '@/lib/insights/generate-insights';
import { computeCategoryBreakdown, computeSpendingHeatmap } from '@/lib/insights/category-breakdown';
import { computeMonthlyComparison } from '@/lib/insights/monthly-comparison';
import { computeMonthSpendingForecast } from '@/lib/insights/spending-forecast';
import { computeSubscriptionAnalysis } from '@/lib/insights/subscription-analysis';
import type { HealthScoreInput, InsightInput } from '@/lib/insights/types';
import { filterTransactionsInMonth, monthKey } from '@/lib/insights/month-utils';
import { useMemo } from 'react';

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
    const { income, expenses } = estimateMonthlyCashflow(transactions, referenceDate);
    const monthlySubscriptionCost = monthlySubscriptionTotal(subscriptions);
    const totalDebt = credits.reduce((sum, c) => sum + c.outstandingBalance, 0);
    const creditMonthlyPayments = credits.reduce(
      (sum, c) => sum + (c.monthlyPayment ?? c.nextPaymentAmount ?? 0),
      0,
    );

    const currentKey = monthKey(referenceDate);
    const monthTxCount = filterTransactionsInMonth(transactions, currentKey, referenceDate).length;

    const monthlyBudget = onboarding?.monthlyIncome ?? null;

    const insightInput: InsightInput = {
      transactions,
      subscriptions,
      credits,
      goals: goals.map((g) => ({
        id: g.id,
        name: g.name,
        current: g.current,
        target: g.target,
      })),
      monthlyIncome: income,
      monthlyExpenses: expenses,
      monthlyBudget,
      netWorthChangePercent: home?.netWorthChangePercent,
      netWorthChangeAmount: home?.netWorthChangeThisMonth,
      referenceDate,
    };

    const healthInput: HealthScoreInput = {
      monthlyIncome: income,
      monthlyExpenses: expenses,
      monthlySubscriptionCost,
      monthlyBudget,
      totalDebt,
      creditMonthlyPayments,
      transactionCountThisMonth: monthTxCount,
    };

    return {
      insights: generateInsights(insightInput),
      healthScore: calculateHealthScore(healthInput),
      monthlyComparison: computeMonthlyComparison(transactions, referenceDate),
      forecast: computeMonthSpendingForecast(transactions, income, monthlyBudget, referenceDate),
      categoryBreakdown: computeCategoryBreakdown(transactions, referenceDate),
      heatmap: computeSpendingHeatmap(transactions, referenceDate),
      subscriptionAnalysis: computeSubscriptionAnalysis(subscriptions),
      credits,
      monthlyIncome: income,
      monthlyExpenses: expenses,
    };
  }, [assets, home, liabilities, onboarding, referenceDate, transactions]);
}
