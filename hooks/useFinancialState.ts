import { useMemo } from 'react';

import { useAssets } from '@/hooks/queries/useAssets';
import { useGoalContributions } from '@/hooks/queries/useGoalContributions';
import { useLoanPayments } from '@/hooks/queries/useLoanPayments';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { calculateFinancialState } from '@/lib/domain/financial/financial-state';
import type {
  CalculateFinancialStateInput,
  FinancialState,
} from '@/lib/domain/financial/financial-state.types';

export type UseFinancialStateOptions = {
  referenceDate?: Date;
};

export type UseFinancialStateResult = {
  state: FinancialState | null;
  isLoading: boolean;
};

/** Hook memoizado — única entrada React para o Financial Core. */
export function useFinancialState(
  options: UseFinancialStateOptions = {},
): UseFinancialStateResult {
  const referenceDate = options.referenceDate ?? new Date();
  const { data: transactions = [], isLoading: txLoading } = useTransactions('all');
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: liabilities, isLoading: liabLoading } = useLiabilities();
  const { data: goalContributions = [], isLoading: goalsLoading } = useGoalContributions();
  const { data: loanPayments = [], isLoading: loanLoading } = useLoanPayments();

  const isLoading =
    txLoading || assetsLoading || liabLoading || goalsLoading || loanLoading;

  const state = useMemo(() => {
    if (isLoading) return null;

    const input: CalculateFinancialStateInput = {
      transactions,
      accounts: [],
      credits: liabilities?.credits ?? assets?.credits ?? [],
      goals: assets?.goals ?? [],
      goalContributions,
      subscriptions: liabilities?.subscriptions ?? assets?.subscriptions ?? [],
      inventory: assets?.inventory ?? [],
      loanPayments,
      today: referenceDate,
    };

    return calculateFinancialState(input);
  }, [
    transactions,
    assets,
    liabilities,
    goalContributions,
    loanPayments,
    referenceDate,
    isLoading,
  ]);

  return { state, isLoading };
}
