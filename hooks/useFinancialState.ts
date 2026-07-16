import type { UseFinancialStateOptions, UseFinancialStateResult } from '@/hooks/useFinancialState.types';
import { useFinancialEngineSnapshot } from '@/hooks/useFinancialEngineSnapshot';

export type { UseFinancialStateOptions, UseFinancialStateResult } from '@/hooks/useFinancialState.types';

/** Hook memoizado — delega no snapshot central do motor financeiro. */
export function useFinancialState(
  options: UseFinancialStateOptions = {},
): UseFinancialStateResult {
  const { coreState, isLoading } = useFinancialEngineSnapshot({
    referenceDate: options.referenceDate,
  });

  return { state: coreState, isLoading };
}
