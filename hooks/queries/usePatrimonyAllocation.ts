import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { fetchPatrimonyAllocation } from '@/lib/api/services/analysis.service';
import { useAuth } from '@/lib/auth';

/**
 * Património / alocação via GET /net-worth (ou fallback /analytics).
 * Query separada para invalidação granular sem recarregar insights.
 */
export function usePatrimonyAllocation() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.netWorth,
    queryFn: fetchPatrimonyAllocation,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
}
