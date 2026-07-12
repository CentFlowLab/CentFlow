import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import type { AssetsData } from '@/lib/domain/assets.types';
import type { CategoryBudget } from '@/lib/domain/category-budget.types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { BankAccount } from '@/lib/domain/account.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import type { LoanPaymentRecord } from '@/lib/domain/financial/loan-payments';
import type { UserPreferences } from '@/lib/preferences/types';

import {
  DEFAULT_RECOMMENDATION_RULE_SETTINGS,
  type RecommendationRuleSettings,
} from './recommendations';
import type { FinancialEngineInput } from './engine.types';

function pickLongestTransactionList(
  entries: Array<[readonly unknown[], Transaction[] | undefined]>,
): Transaction[] {
  let best: Transaction[] = [];
  for (const [, data] of entries) {
    if (data && data.length > best.length) {
      best = data;
    }
  }
  return best;
}

function resolveRecommendationRules(
  preferences?: UserPreferences,
): RecommendationRuleSettings {
  if (!preferences) return { ...DEFAULT_RECOMMENDATION_RULE_SETTINGS };
  return {
    debt_vs_investment:
      preferences.recommendationDebtVsInvestment ??
      DEFAULT_RECOMMENDATION_RULE_SETTINGS.debt_vs_investment,
    surplus_allocation:
      preferences.recommendationSurplusAllocation ??
      DEFAULT_RECOMMENDATION_RULE_SETTINGS.surplus_allocation,
    category_above_median:
      preferences.recommendationCategoryMedian ??
      DEFAULT_RECOMMENDATION_RULE_SETTINGS.category_above_median,
    emergency_fund:
      preferences.recommendationEmergencyFund ??
      DEFAULT_RECOMMENDATION_RULE_SETTINGS.emergency_fund,
    habit_insight:
      preferences.recommendationHabitInsight ??
      DEFAULT_RECOMMENDATION_RULE_SETTINGS.habit_insight,
  };
}

/** Recolhe snapshot financeiro do cache React Query (sem I/O). */
export function gatherFinancialEngineInput(
  queryClient: QueryClient,
  userId: string,
): FinancialEngineInput | null {
  if (!userId) return null;

  const transactionEntries = queryClient.getQueriesData<Transaction[]>({
    queryKey: ['transactions'],
  });
  const transactions = pickLongestTransactionList(transactionEntries);

  const assets = queryClient.getQueryData<AssetsData>(queryKeys.assets);
  const liabilities = queryClient.getQueryData<{ credits: AssetsData['credits']; subscriptions: AssetsData['subscriptions'] }>(
    queryKeys.liabilities(userId),
  );
  const goalContributions =
    queryClient.getQueryData<GoalContribution[]>(queryKeys.goalContributions) ?? [];
  const loanPayments =
    queryClient.getQueryData<LoanPaymentRecord[]>(queryKeys.loanPayments) ?? [];
  const categoryBudgets =
    queryClient.getQueryData<CategoryBudget[]>(queryKeys.categoryBudgets(userId)) ?? [];
  const accounts = queryClient.getQueryData<BankAccount[]>(queryKeys.accounts) ?? [];
  const preferences = queryClient.getQueryData<UserPreferences>(queryKeys.preferences);

  const credits = liabilities?.credits ?? assets?.credits ?? [];
  const subscriptions = liabilities?.subscriptions ?? assets?.subscriptions ?? [];

  return {
    transactions,
    accounts,
    credits,
    goals: assets?.goals ?? [],
    goalContributions,
    subscriptions,
    inventory: assets?.inventory ?? [],
    loanPayments,
    categoryBudgets,
    dismissedSubscriptionIds: [],
    prioritizeDebtAmortization: preferences?.prioritizeDebtAmortization ?? true,
    recommendationRules: resolveRecommendationRules(preferences),
    categorySpendAlertThreshold: preferences?.categorySpendAlertThreshold ?? 2,
  };
}
