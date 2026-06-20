import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';

/** Chaves React Query a invalidar após mutações de movimentos. */
export function invalidateTransactionQueryTargets(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
  queryClient.invalidateQueries({ queryKey: queryKeys.home });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
  queryClient.invalidateQueries({ queryKey: queryKeys.financialProfile });
  queryClient.invalidateQueries({ queryKey: queryKeys.netWorth });
}

export const TRANSACTION_INVALIDATION_ROOT_KEYS = [
  'transactions',
  'home',
  'dashboard',
  'analytics',
  'financialProfile',
  'netWorth',
] as const;
