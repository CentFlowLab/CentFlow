import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { fetchHomeScreenData } from '@/lib/api/services/home.service';
import { useAuth } from '@/lib/auth';
import type { DashboardData } from '@/lib/domain';

/**
 * Hook principal do Dashboard — dados reais da API.
 * Substituído: buildMockDashboard() em useDashboard.ts
 */
export function useDashboardData() {
  const { isAuthenticated } = useAuth();

  return useQuery<DashboardData>({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const home = await fetchHomeScreenData();
      return home;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
}
