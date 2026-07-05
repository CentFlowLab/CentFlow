import { useMemo } from 'react';

import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { useAssets } from '@/hooks/queries/useAssets';
import { useCategoryBudgetStatus } from '@/hooks/queries/useCategoryBudgets';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { useMonthlySpendable } from '@/hooks/useMonthlySpendable';
import {
  buildFinancialActions,
  calculateRealSavingsMargin,
  type FinancialAction,
  type RealSavingsMarginBreakdown,
} from '@/lib/domain/financial/action-engine';

type UseFinancialActionsOptions = {
  maxActions?: number;
  asOf?: Date;
};

export function useFinancialActions(options?: UseFinancialActionsOptions) {
  const spendable = useMonthlySpendable(options?.asOf);
  const { statuses, isLoading: budgetsLoading } = useCategoryBudgetStatus(options?.asOf);
  const { data: transactions = [], isLoading: txLoading } = useTransactions('all');
  const { data: liabilities, isLoading: liabilitiesLoading } = useLiabilities();
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: accounts = [], isLoading: accountsLoading } = useAccountsWithBalances();
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences();

  const asOf = options?.asOf ?? new Date();

  const margin = useMemo(
    () => calculateRealSavingsMargin(spendable.available, transactions, asOf),
    [spendable.available, transactions, asOf],
  );

  const actions = useMemo(
    () =>
      buildFinancialActions({
        asOf,
        budgetStatuses: statuses,
        transactions,
        subscriptions: liabilities?.subscriptions ?? assets?.subscriptions ?? [],
        goals: assets?.goals ?? [],
        accounts,
        credits: liabilities?.credits ?? [],
        availableThisMonth: spendable.available,
        prioritizeDebtAmortization: preferences?.prioritizeDebtAmortization ?? true,
        margin,
        maxActions: options?.maxActions,
      }),
    [
      asOf,
      options?.maxActions,
      statuses,
      transactions,
      liabilities?.subscriptions,
      liabilities?.credits,
      assets?.subscriptions,
      assets?.goals,
      accounts,
      spendable.available,
      preferences?.prioritizeDebtAmortization,
      margin,
    ],
  );

  return {
    actions,
    margin,
    isLoading:
      budgetsLoading ||
      txLoading ||
      liabilitiesLoading ||
      assetsLoading ||
      accountsLoading ||
      prefsLoading,
  };
}

export type { FinancialAction, RealSavingsMarginBreakdown };
