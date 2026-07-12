import type { QueryClient } from '@tanstack/react-query';

import { gatherFinancialEngineInput } from './engine.gather';
import { invalidateFinancialDerivedQueries } from './engine.invalidation';
import { recalculateFinancialState } from './engine';
import type { FinancialEngineRunResult, FinancialRecalcTrigger } from './engine.types';
import { queryKeys } from '@/lib/api/keys';

/**
 * Agenda recálculo financeiro em background (não bloqueia a UI).
 * Ao terminar, grava snapshot no cache e invalida queries derivadas.
 */
export function scheduleFinancialRecalculation(
  queryClient: QueryClient,
  userId: string,
  trigger: FinancialRecalcTrigger,
): void {
  if (!userId) return;

  queueMicrotask(() => {
    void runFinancialRecalculation(queryClient, userId, trigger);
  });
}

export async function runFinancialRecalculation(
  queryClient: QueryClient,
  userId: string,
  trigger: FinancialRecalcTrigger,
): Promise<FinancialEngineRunResult | null> {
  const input = gatherFinancialEngineInput(queryClient, userId);
  if (!input) {
    invalidateFinancialDerivedQueries(queryClient, userId);
    return null;
  }

  const result = await recalculateFinancialState(userId, input, trigger);
  queryClient.setQueryData(queryKeys.financialEngine(userId), result);
  invalidateFinancialDerivedQueries(queryClient, userId);
  return result;
}
