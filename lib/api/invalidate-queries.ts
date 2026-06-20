import type { QueryClient } from '@tanstack/react-query';

import { traceMovementStep } from '@/lib/doctor/movement-flow-trace';
import { queryKeys } from '@/lib/api/keys';
import { invalidateTransactionQueryTargets } from '@/lib/api/transaction-invalidation';

export function invalidateTransactionQueries(queryClient: QueryClient): void {
  traceMovementStep('cache_invalidate_start', { component: 'invalidateTransactionQueries' });
  invalidateTransactionQueryTargets(queryClient);
  traceMovementStep('cache_invalidate_done', { component: 'invalidateTransactionQueries' });
}

export function invalidateAssetsQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.assets });
  queryClient.invalidateQueries({ queryKey: queryKeys.home });
  queryClient.invalidateQueries({ queryKey: queryKeys.financialProfile });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  queryClient.invalidateQueries({ queryKey: queryKeys.netWorth });
}

export function invalidateAllRemoteData(queryClient: QueryClient): void {
  invalidateTransactionQueries(queryClient);
  invalidateAssetsQueries(queryClient);
}
