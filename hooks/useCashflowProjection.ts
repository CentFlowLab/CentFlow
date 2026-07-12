import { useMemo } from 'react';

import { captureDomainCalculationError } from '@/lib/sentry';
import { useAssets } from '@/hooks/queries/useAssets';
import { useGoalContributions } from '@/hooks/queries/useGoalContributions';
import { useLoanPayments } from '@/hooks/queries/useLoanPayments';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import {
  buildCashflowProjection,
  type CashflowProjectionHorizon,
  type CashflowProjectionResult,
} from '@/lib/projections';

export type UseCashflowProjectionResult = {
  projection: CashflowProjectionResult | null;
  isLoading: boolean;
};

/** Projeção de cashflow — recalcula quando transações/preferências mudam (TanStack Query). */
export function useCashflowProjection(
  horizon: CashflowProjectionHorizon = 30,
): UseCashflowProjectionResult {
  const { data: transactions = [], isLoading: txLoading } = useTransactions('all');
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: liabilities, isLoading: liabLoading } = useLiabilities();
  const { data: goalContributions = [], isLoading: goalsLoading } = useGoalContributions();
  const { data: loanPayments = [], isLoading: loanLoading } = useLoanPayments();
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences();

  const isLoading =
    txLoading || assetsLoading || liabLoading || goalsLoading || loanLoading || prefsLoading;

  const projection = useMemo(() => {
    if (isLoading) return null;

    try {
      return buildCashflowProjection({
        horizon,
        transactions,
        subscriptions: liabilities?.subscriptions ?? assets?.subscriptions ?? [],
        credits: liabilities?.credits ?? assets?.credits ?? [],
        goalContributions,
        loanPayments,
        prioritizeDebtAmortization: preferences?.prioritizeDebtAmortization ?? true,
      });
    } catch (error) {
      captureDomainCalculationError('cashflow_projection', error, { horizon });
      return null;
    }
  }, [
    assets,
    goalContributions,
    horizon,
    isLoading,
    liabilities,
    loanPayments,
    preferences?.prioritizeDebtAmortization,
    transactions,
  ]);

  return {
    projection,
    isLoading,
  };
}
