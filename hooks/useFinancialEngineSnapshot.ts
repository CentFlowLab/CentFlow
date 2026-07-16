import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAccounts } from '@/hooks/queries/useAccounts';
import { useAssets } from '@/hooks/queries/useAssets';
import { useCategoryBudgets } from '@/hooks/queries/useCategoryBudgets';
import { useGoalContributions } from '@/hooks/queries/useGoalContributions';
import { useLoanPayments } from '@/hooks/queries/useLoanPayments';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { queryKeys } from '@/lib/api/keys';
import { useAuth } from '@/lib/auth';
import { gatherFinancialEngineInput } from '@/lib/domain/financial/engine.gather';
import { runCoreFinancialState } from '@/lib/domain/financial/engine.core';
import { scheduleFinancialRecalculation } from '@/lib/domain/financial/engine.runner';
import type { FinancialEngineRunResult } from '@/lib/domain/financial/engine.types';
import type { FinancialState } from '@/lib/domain/financial/financial-state.types';

export type UseFinancialEngineSnapshotOptions = {
  referenceDate?: Date;
};

export type FinancialEngineSnapshot = {
  coreState: FinancialState | null;
  engineResults: FinancialEngineRunResult['results'] | null;
  isLoading: boolean;
};

/**
 * Snapshot financeiro central — uma fonte temporal para Home, Análises, Assistant, etc.
 * Lê cache do motor quando disponível; calcula inline com a mesma API até o cache estar pronto.
 */
export function useFinancialEngineSnapshot(
  options: UseFinancialEngineSnapshotOptions = {},
): FinancialEngineSnapshot {
  const referenceDate = useMemo(
    () => options.referenceDate ?? new Date(),
    [options.referenceDate],
  );
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const { data: transactions = [], isLoading: txLoading } = useTransactions('all');
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: liabilities, isLoading: liabLoading } = useLiabilities();
  const { data: goalContributions = [], isLoading: goalsLoading } = useGoalContributions();
  const { data: loanPayments = [], isLoading: loanLoading } = useLoanPayments();
  const { isLoading: budgetsLoading } = useCategoryBudgets();
  const { isLoading: prefsLoading } = useUserPreferences();

  const isLoading =
    txLoading ||
    accountsLoading ||
    assetsLoading ||
    liabLoading ||
    goalsLoading ||
    loanLoading ||
    budgetsLoading ||
    prefsLoading;

  const inputFingerprint = useMemo(
    () =>
      [
        transactions.length,
        accounts.length,
        assets?.goals?.length ?? 0,
        liabilities?.credits?.length ?? 0,
        goalContributions.length,
        loanPayments.length,
        referenceDate.toISOString().slice(0, 10),
      ].join(':'),
    [
      transactions.length,
      accounts.length,
      assets?.goals?.length,
      liabilities?.credits?.length,
      goalContributions.length,
      loanPayments.length,
      referenceDate,
    ],
  );

  useEffect(() => {
    if (!userId || isLoading) return;
    scheduleFinancialRecalculation(queryClient, userId, { type: 'manual_refresh' });
  }, [queryClient, userId, isLoading, inputFingerprint]);

  const { data: engineRun } = useQuery<FinancialEngineRunResult | undefined>({
    queryKey: queryKeys.financialEngine(userId),
    queryFn: async () =>
      queryClient.getQueryData<FinancialEngineRunResult>(queryKeys.financialEngine(userId)),
    enabled: Boolean(userId) && !isLoading,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const snapshot = useMemo((): FinancialEngineSnapshot => {
    if (isLoading || !userId) {
      return { coreState: null, engineResults: null, isLoading: true };
    }

    const cachedCore = engineRun?.results?.coreState;
    if (cachedCore) {
      return {
        coreState: cachedCore,
        engineResults: engineRun?.results ?? null,
        isLoading: false,
      };
    }

    const gathered = gatherFinancialEngineInput(queryClient, userId);
    if (!gathered) {
      return { coreState: null, engineResults: null, isLoading: false };
    }

    const coreState = runCoreFinancialState(
      { ...gathered, referenceDate },
      referenceDate,
    );

    return { coreState, engineResults: null, isLoading: false };
  }, [engineRun, isLoading, queryClient, referenceDate, userId]);

  return snapshot;
}
