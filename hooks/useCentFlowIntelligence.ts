import { useMemo } from 'react';

import { useAssets } from '@/hooks/queries/useAssets';
import { useHomeScreenData } from '@/hooks/queries/useHomeScreenData';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { resolveAssistancePreferences } from '@/lib/onboarding/assistance';
import { getWarrantiesSummary } from '@/lib/domain/warranty.utils';
import { countRenewalsSoon } from '@/lib/subscriptions/renewal.utils';
import { isTransactionOccurred } from '@/lib/domain/transaction-date.utils';
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
  asOf: Date = new Date(),
): number | null {
  const now = asOf;
  const thisWeekStart = getWeekStart(now).getTime();
  const lastWeekStart = thisWeekStart - 7 * 24 * 60 * 60 * 1000;

  let thisWeek = 0;
  let lastWeek = 0;

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (!isTransactionOccurred(tx.date, asOf)) continue;
    const time = new Date(`${tx.date.slice(0, 10)}T12:00:00`).getTime();
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
  const { data: onboardingAnswers } = useOnboardingAnswers();

  return useMemo(() => {
    const safeTransactions = transactions ?? [];
    const subscriptions = liabilities?.subscriptions ?? assets?.subscriptions ?? [];
    const credits = liabilities?.credits ?? assets?.credits ?? [];
    const goals = assets?.goals ?? [];
    const warranties = assets?.warranties ?? [];

    try {
      const { income, expenses } = estimateMonthlyCashflow(safeTransactions);
      const monthlySubscriptionCost = monthlySubscriptionTotal(subscriptions);
      const totalDebt = credits.reduce(
        (sum, credit) => sum + (credit.outstandingBalance ?? 0),
        0,
      );
      const warrantySummary = getWarrantiesSummary(warranties);

      const scoreInput = {
        netWorth: home?.netWorth?.netWorth ?? 0,
        netWorthChangePercent: home?.netWorthChangePercent ?? 0,
        monthlyIncome: income,
        monthlyExpenses: expenses,
        monthlySubscriptionCost,
        totalDebt,
        goals: goals.map((goal) => ({
          current: goal.current ?? 0,
          target: goal.target ?? 0,
        })),
        subscriptionsRenewingSoon: countRenewalsSoon(subscriptions),
        featuredGoalGap: home?.featuredGoal
          ? Math.max(0, (home.featuredGoal.target ?? 0) - (home.featuredGoal.current ?? 0))
          : null,
        warrantiesExpiringSoon: warrantySummary.expiringSoon,
        weeklyExpenseDelta: compareWeeklyExpenses(safeTransactions),
        goalsCount: goals.length,
        transactionCount: safeTransactions.length,
      };

      const score: CentFlowScoreResult = calculateCentFlowScore(scoreInput);
      const levelProgress = getFinancialLevelProgress(score.score);
      const assistancePrefs = resolveAssistancePreferences(onboardingAnswers);
      const firstName = profile?.name?.split(' ')[0] ?? 'Utilizador';
      const assistant: DailyAssistantPlan = buildDailyAssistantPlan({
        ...scoreInput,
        firstName,
        subscriptionCount: subscriptions.length,
        goalsCount: goals.length,
        transactionCount: safeTransactions.length,
        maxInsights: assistancePrefs.maxInsights,
        showSavingsTip: assistancePrefs.showSavingsTip,
        verboseDescriptions: assistancePrefs.verboseDescriptions,
      });

      return {
        score,
        levelProgress,
        assistant,
        monthlySubscriptionCost,
        subscriptionCount: subscriptions.length,
      };
    } catch (error) {
      console.error('[CentFlowIntelligence]', error);
      return {
        score: calculateCentFlowScore({
          netWorth: 0,
          netWorthChangePercent: 0,
          monthlyIncome: 0,
          monthlyExpenses: 0,
          monthlySubscriptionCost: 0,
          totalDebt: 0,
          goals: [],
          subscriptionsRenewingSoon: 0,
          goalsCount: 0,
          transactionCount: 0,
        }),
        levelProgress: getFinancialLevelProgress(0),
        assistant: {
          greeting: 'Olá',
          insights: [],
        },
        monthlySubscriptionCost: 0,
        subscriptionCount: 0,
      };
    }
  }, [assets, home, liabilities, onboardingAnswers, profile?.name, transactions]);
}

export type { CentFlowScoreResult, DailyAssistantPlan, FinancialLevel };
