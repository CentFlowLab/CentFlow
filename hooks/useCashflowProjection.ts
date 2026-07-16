import { useMemo } from 'react';

import { useFinancialEngineSnapshot } from '@/hooks/useFinancialEngineSnapshot';
import {
  CASHFLOW_PROJECTION_HORIZONS,
  type CashflowProjectionHorizon,
  type CashflowProjectionResult,
} from '@/lib/domain/financial/cashflow-projection';
import { selectCashflowProjection } from '@/lib/domain/financial/engine.selectors';

export type UseCashflowProjectionResult = {
  projection: CashflowProjectionResult | null;
  isLoading: boolean;
};

/** Projeção de cashflow — lê snapshot do motor financeiro (passo cashflowProjection). */
export function useCashflowProjection(
  horizon: CashflowProjectionHorizon = CASHFLOW_PROJECTION_HORIZONS[0],
): UseCashflowProjectionResult {
  const { engineResults, isLoading } = useFinancialEngineSnapshot();

  const projection = useMemo(() => {
    const cached = selectCashflowProjection(engineResults ?? undefined);
    if (!cached) return null;
    return cached.horizon === horizon ? cached : null;
  }, [engineResults, horizon]);

  return { projection, isLoading };
}
