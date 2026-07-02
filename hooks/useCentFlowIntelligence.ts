import { useMemo } from 'react';

import { useAssets } from '@/hooks/queries/useAssets';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useFinancialState } from '@/hooks/useFinancialState';
import { resolveAssistancePreferences } from '@/lib/onboarding/assistance';
import { getWarrantiesSummary } from '@/lib/domain/warranty.utils';
import { isTransactionOccurred } from '@/lib/domain/transaction-date.utils';
import {
  buildDailyAssistantPlan,
  calculateCentFlowScore,
  getFinancialLevelProgress,
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
  const thisWeekStart = getWeekStart(asOf).getTime();
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

const EMPTY_SCORE = calculateCentFlowScore({
  netWorth: 0,
  netWorthChangePercent: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  monthlySubscriptionCost: 0,
  totalDebt: 0,
  goals: [],
  subscriptionsRenewingSoon: 0,
  featuredGoalGap: null,
  warrantiesExpiringSoon: 0,
  weeklyExpenseDelta: null,
  goalsCount: 0,
  transactionCount: 0,
});

export function useCentFlowIntelligence() {
  const { state } = useFinancialState();
  const { data: transactions = [] } = useTransactions('all');
  const { data: assets } = useAssets();
  const { data: profile } = useProfile();
  const { data: onboardingAnswers } = useOnboardingAnswers();

  return useMemo(() => {
    if (!state) {
      return {
        score: EMPTY_SCORE,
        levelProgress: getFinancialLevelProgress(EMPTY_SCORE.score),
        assistant: buildDailyAssistantPlan({
          netWorth: 0,
          netWorthChangePercent: 0,
          monthlyIncome: 0,
          monthlyExpenses: 0,
          monthlySubscriptionCost: 0,
          totalDebt: 0,
          goals: [],
          subscriptionsRenewingSoon: 0,
          featuredGoalGap: null,
          warrantiesExpiringSoon: 0,
          weeklyExpenseDelta: null,
          goalsCount: 0,
          transactionCount: 0,
          firstName: profile?.name?.split(' ')[0] ?? 'Utilizador',
          subscriptionCount: 0,
          maxInsights: 2,
          showSavingsTip: true,
          verboseDescriptions: false,
        }),
        monthlySubscriptionCost: 0,
        subscriptionCount: 0,
      };
    }

    const subscriptions = state.subscriptions.items;
    const goals = assets?.goals ?? [];
    const warrantySummary = getWarrantiesSummary(assets?.warranties ?? []);
    const weeklyExpenseDelta = compareWeeklyExpenses(transactions, state.asOf);

    const score: CentFlowScoreResult = {
      score: state.healthScore.score,
      band: state.healthScore.band,
      bandLabel: state.healthScore.bandLabel,
      breakdown: state.healthScore.breakdown,
      summary: state.healthScore.summary,
    };

    const levelProgress = getFinancialLevelProgress(score.score);
    const assistancePrefs = resolveAssistancePreferences(onboardingAnswers);
    const firstName = profile?.name?.split(' ')[0] ?? 'Utilizador';

    const assistant: DailyAssistantPlan = buildDailyAssistantPlan({
      netWorth: state.netWorth.netWorth,
      netWorthChangePercent: state.netWorthChangePercent,
      monthlyIncome: state.cashFlow.monthlyIncome,
      monthlyExpenses: state.cashFlow.monthlyExpenses,
      monthlySubscriptionCost: state.subscriptions.monthlyTotal,
      totalDebt: state.creditSummary.totalDebt,
      goals: state.goalProgress.map((g: { current: number; target: number }) => ({
        current: g.current,
        target: g.target,
      })),
      subscriptionsRenewingSoon: state.subscriptions.renewingSoon,
      featuredGoalGap: state.goalProgress[0]
        ? Math.max(0, state.goalProgress[0].target - state.goalProgress[0].current)
        : null,
      warrantiesExpiringSoon: warrantySummary.expiringSoon,
      weeklyExpenseDelta,
      goalsCount: goals.length,
      transactionCount: state.healthScore.input.transactionCount ?? 0,
      firstName,
      subscriptionCount: subscriptions.length,
      maxInsights: assistancePrefs.maxInsights,
      showSavingsTip: assistancePrefs.showSavingsTip,
      verboseDescriptions: assistancePrefs.verboseDescriptions,
    });

    return {
      score,
      levelProgress,
      assistant,
      monthlySubscriptionCost: state.subscriptions.monthlyTotal,
      subscriptionCount: subscriptions.length,
    };
  }, [assets, onboardingAnswers, profile?.name, state, transactions]);
}

export type { CentFlowScoreResult, DailyAssistantPlan, FinancialLevel };
