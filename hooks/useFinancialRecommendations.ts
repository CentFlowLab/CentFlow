import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { useAuth } from '@/lib/auth';
import type { FinancialEngineRunResult } from '@/lib/domain/financial/engine.types';
import { scheduleFinancialRecalculation } from '@/lib/domain/financial/engine.runner';
import type { Recommendation } from '@/lib/domain/financial/recommendations';

/** Lê recomendações do snapshot gravado pelo motor financeiro. */
export function useFinancialRecommendations(): Recommendation[] {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  useEffect(() => {
    if (!userId) return;
    const existing = queryClient.getQueryData<FinancialEngineRunResult>(
      queryKeys.financialEngine(userId),
    );
    if (!existing) {
      scheduleFinancialRecalculation(queryClient, userId, { type: 'manual_refresh' });
    }
  }, [queryClient, userId]);

  const { data } = useQuery<FinancialEngineRunResult | undefined>({
    queryKey: queryKeys.financialEngine(userId),
    queryFn: async () => undefined,
    enabled: Boolean(userId),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return data?.results.recommendations ?? [];
}
