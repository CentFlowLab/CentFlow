import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { fetchAnalysisData } from '@/lib/api/services/analysis.service';
import { useAuth } from '@/lib/auth';
import type { AnalysisData } from '@/lib/domain/analysis.types';

/**
 * Hook principal da aba Análises — dados reais da API.
 * Substituído: buildMockAnalysisData() com fallback silencioso.
 *
 * Invalidação: queryClient.invalidateQueries({ queryKey: queryKeys.analytics() })
 */
export function useAnalysisData() {
  const { isAuthenticated } = useAuth();

  return useQuery<AnalysisData>({
    queryKey: queryKeys.analytics(),
    queryFn: fetchAnalysisData,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
}
