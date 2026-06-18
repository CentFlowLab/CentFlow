import { useMemo } from 'react';

import { useAssets } from '@/hooks/queries/useAssets';
import { useHomeScreenData } from '@/hooks/queries/useHomeScreenData';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { getWarrantiesSummary } from '@/lib/domain/warranty.utils';
import {
  buildDailyAssistantPlan,
  calculateCentFlowScore,
  estimateMonthlyCashflow,
  getFinancialLevelProgress,
  monthlySubscriptionTotal,
  type CentFlowScoreResult,
  type DailyAssistantPlan,
  type FinancialLevel,
} from '@/lib/domain/financial';

function countRenewalsSoon(
  subscriptions: Array<{ renewsAt?: string }>,
  withinDays = 14,
): number {
  const now = Date.now();
  const limit = now + withinDays * 24 * 60 * 60 * 1000;

  return subscriptions.filter((sub) => {
    if (!sub.renewsAt) return false;
    const time = new Date(sub.renewsAt).getTime();
    return time >= now && time <= limit;
  }).length;
}

function getWeekStart(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function compareWeeklyExpenses(
  transactions: Array<{ type: string; amount: number; date: string }>,
): number | null {
  const now = new Date();
  const thisWeekStart = getWeekStart(now).getTime();
  const lastWeekStart = thisWeekStart - 7 * 24 * 60 * 60 * 1000;

  let thisWeek = 0;
  let lastWeek = 0;

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const time = new Date(tx.date).getTime();
    if (time >= thisWeekStart) thisWeek += tx.amount;
    else if (time >= lastWeekStart && time < thisWeekStart) lastWeek += tx.amount;
  }

  if (thisWeek === 0 && lastWeek === 0) return null;
  return thisWeek - lastWeek;
}

export function useCentFlowIntelligence() {
  const { data: home } = useHomeScreenData();
  const { data: transactions = [] } = useTransactions('all');
  const { data: assets } = useAssets();
  const { data: liabilities } = useLiabilities();
  const { data: profile } = useProfile();

  return useMemo(() => {
    const subscriptions = liabilities?.subscriptions ?? assets?.subscriptions ?? [];
    const credits = liabilities?.credits ?? assets?.credits ?? [];
    const goals = assets?.goals ?? [];
    const warranties = assets?.warranties ?? [];
    const { income, expenses } = estimateMonthlyCashflow(transactions);
    const monthlySubscriptionCost = monthlySubscriptionTotal(subscriptions);
    const totalDebt = credits.reduce((sum, credit) => sum + credit.outstandingBalance, 0);
    const warrantySummary = getWarrantiesSummary(warranties);

    const scoreInput = {
      netWorth: home?.netWorth.netWorth ?? 0,
      netWorthChangePercent: home?.netWorthChangePercent ?? 0,
      monthlyIncome: income,
      monthlyExpenses: expenses,
      monthlySubscriptionCost,
      totalDebt,
      goals: goals.map((goal) => ({ current: goal.current, target: goal.target })),
      subscriptionsRenewingSoon: countRenewalsSoon(subscriptions),
      featuredGoalGap: home?.featuredGoal
        ? Math.max(0, home.featuredGoal.target - home.featuredGoal.current)
        : null,
      warrantiesExpiringSoon: warrantySummary.expiringSoon,
      weeklyExpenseDelta: compareWeeklyExpenses(transactions),
      goalsCount: goals.length,
      transactionCount: transactions.length,
    };

    const score: CentFlowScoreResult = calculateCentFlowScore(scoreInput);
    const levelProgress = getFinancialLevelProgress(score.score);
    const firstName = profile?.name?.split(' ')[0] ?? 'Utilizador';
    const assistant: DailyAssistantPlan = buildDailyAssistantPlan({
      ...scoreInput,
      firstName,
      subscriptionCount: subscriptions.length,
      goalsCount: goals.length,
      transactionCount: transactions.length,
    });

    return {
      score,
      levelProgress,
      assistant,
      monthlySubscriptionCost,
      subscriptionCount: subscriptions.length,
    };
  }, [assets, home, liabilities, profile?.name, transactions]);
}

export type { CentFlowScoreResult, DailyAssistantPlan, FinancialLevel };
