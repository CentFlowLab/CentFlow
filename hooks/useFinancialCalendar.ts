import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAssets } from '@/hooks/queries/useAssets';
import { useGoalContributions } from '@/hooks/queries/useGoalContributions';
import { useLoanPayments } from '@/hooks/queries/useLoanPayments';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { useFinancialState } from '@/hooks/useFinancialState';
import { queryKeys } from '@/lib/api/keys';
import { useAuth } from '@/lib/auth';
import {
  buildFinancialCalendar,
  type FinancialCalendarResult,
} from '@/lib/domain/financial/calendar';
import { captureAppError } from '@/lib/sentry';

export type UseFinancialCalendarOptions = {
  horizonDays?: number;
};

export function useFinancialCalendar(
  options: UseFinancialCalendarOptions = {},
): {
  calendar: FinancialCalendarResult | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<void>;
  isRefetching: boolean;
} {
  const horizonDays = options.horizonDays ?? 30;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const { state, isLoading: stateLoading } = useFinancialState();
  const {
    data: transactions = [],
    isLoading: txLoading,
    isError: txError,
    error: txErrorValue,
    isRefetching: txRefetching,
    refetch: refetchTx,
  } = useTransactions('all');
  const {
    data: assets,
    isLoading: assetsLoading,
    isError: assetsError,
    error: assetsErrorValue,
    isRefetching: assetsRefetching,
    refetch: refetchAssets,
  } = useAssets();
  const {
    data: liabilities,
    isLoading: liabLoading,
    isError: liabError,
    error: liabErrorValue,
    isRefetching: liabRefetching,
    refetch: refetchLiabilities,
  } = useLiabilities();
  const {
    data: goalContributions = [],
    isLoading: goalsLoading,
    isError: goalsError,
    error: goalsErrorValue,
    isRefetching: goalsRefetching,
    refetch: refetchGoalContributions,
  } = useGoalContributions();
  const {
    data: loanPayments = [],
    isLoading: loanLoading,
    isError: loanError,
    error: loanErrorValue,
    isRefetching: loanRefetching,
    refetch: refetchLoanPayments,
  } = useLoanPayments();
  const {
    data: preferences,
    isLoading: prefsLoading,
    isError: prefsError,
    error: prefsErrorValue,
    isRefetching: prefsRefetching,
    refetch: refetchPreferences,
  } = useUserPreferences();

  const isLoading =
    stateLoading ||
    txLoading ||
    assetsLoading ||
    liabLoading ||
    goalsLoading ||
    loanLoading ||
    prefsLoading;

  const isRefetching =
    txRefetching ||
    assetsRefetching ||
    liabRefetching ||
    goalsRefetching ||
    loanRefetching ||
    prefsRefetching;

  const queryError =
    txErrorValue ??
    assetsErrorValue ??
    liabErrorValue ??
    goalsErrorValue ??
    loanErrorValue ??
    prefsErrorValue ??
    null;

  const hasQueryError =
    txError || assetsError || liabError || goalsError || loanError || prefsError;

  const buildResult = useMemo(() => {
    if (isLoading || !state) {
      return { calendar: null as FinancialCalendarResult | null, buildError: null as Error | null };
    }

    try {
      return {
        calendar: buildFinancialCalendar(state, horizonDays, {
          transactions,
          subscriptions: liabilities?.subscriptions ?? assets?.subscriptions ?? [],
          credits: liabilities?.credits ?? assets?.credits ?? [],
          goalContributions,
          loanPayments,
          prioritizeDebtAmortization: preferences?.prioritizeDebtAmortization ?? true,
          asOf: state.asOf,
        }),
        buildError: null,
      };
    } catch (error) {
      captureAppError(error, { source: 'financial:calendar', severity: 'high', extra: { horizonDays } });
      const buildError =
        error instanceof Error
          ? error
          : new Error('Não foi possível calcular o calendário financeiro.');
      return { calendar: null, buildError };
    }
  }, [
    assets,
    goalContributions,
    horizonDays,
    isLoading,
    liabilities,
    loanPayments,
    preferences?.prioritizeDebtAmortization,
    state,
    transactions,
  ]);

  const isError = hasQueryError || buildResult.buildError !== null;
  const error = buildResult.buildError ?? queryError;

  const refetch = useCallback(async () => {
    await Promise.all([
      refetchTx(),
      refetchAssets(),
      refetchLiabilities(),
      refetchGoalContributions(),
      refetchLoanPayments(),
      refetchPreferences(),
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.assets }),
      queryClient.invalidateQueries({ queryKey: queryKeys.liabilities(userId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.goalContributions }),
      queryClient.invalidateQueries({ queryKey: queryKeys.loanPayments }),
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences }),
    ]);
  }, [
    queryClient,
    refetchAssets,
    refetchGoalContributions,
    refetchLiabilities,
    refetchLoanPayments,
    refetchPreferences,
    refetchTx,
    userId,
  ]);

  return {
    calendar: buildResult.calendar,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  };
}
