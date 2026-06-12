import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { fetchNetWorthData } from '@/lib/api/services/dashboard.service';
import { useAuth } from '@/lib/auth';
import type { NetWorthResult } from '@/lib/domain';

/**
 * Hook dedicado ao património líquido.
 * Usa endpoint /net-worth com fallback para /dashboard.
 */
export function useNetWorth() {
  const { isAuthenticated } = useAuth();

  return useQuery<NetWorthResult>({
    queryKey: queryKeys.netWorth,
    queryFn: fetchNetWorthData,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });
}
