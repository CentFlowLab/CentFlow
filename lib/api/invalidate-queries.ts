import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';

export function invalidateTransactionQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
  queryClient.invalidateQueries({ queryKey: queryKeys.home });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
  queryClient.invalidateQueries({ queryKey: queryKeys.financialProfile });
  queryClient.invalidateQueries({ queryKey: queryKeys.netWorth });
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
