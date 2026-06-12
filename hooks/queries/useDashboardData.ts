import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { fetchDashboardData } from '@/lib/api/services/dashboard.service';
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
    queryFn: fetchDashboardData,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });
}
