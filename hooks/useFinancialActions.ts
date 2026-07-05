import { useMemo } from 'react';

import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { useAssets } from '@/hooks/queries/useAssets';
import { useCategoryBudgetStatus } from '@/hooks/queries/useCategoryBudgets';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useMonthlySpendable } from '@/hooks/useMonthlySpendable';
import { buildFinancialActions, type FinancialAction } from '@/lib/domain/financial/action-engine';

type UseFinancialActionsOptions = {
  maxActions?: number;
  asOf?: Date;
};

export function useFinancialActions(options?: UseFinancialActionsOptions) {
  const spendable = useMonthlySpendable();
  const { statuses, isLoading: budgetsLoading } = useCategoryBudgetStatus(options?.asOf);
  const { data: transactions = [], isLoading: txLoading } = useTransactions('all');
  const { data: liabilities, isLoading: liabilitiesLoading } = useLiabilities();
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: accounts = [], isLoading: accountsLoading } = useAccountsWithBalances();

  const actions = useMemo(
    () =>
      buildFinancialActions({
        asOf: options?.asOf,
        budgetStatuses: statuses,
        transactions,
        subscriptions: liabilities?.subscriptions ?? assets?.subscriptions ?? [],
        goals: assets?.goals ?? [],
        accounts,
        availableThisMonth: spendable.available,
        maxActions: options?.maxActions,
      }),
    [
      options?.asOf,
      options?.maxActions,
      statuses,
      transactions,
      liabilities?.subscriptions,
      assets?.subscriptions,
      assets?.goals,
      accounts,
      spendable.available,
    ],
  );

  return {
    actions,
    isLoading:
      budgetsLoading || txLoading || liabilitiesLoading || assetsLoading || accountsLoading,
  };
}

export type { FinancialAction };
