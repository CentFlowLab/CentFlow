import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { fetchHomeScreenData } from '@/lib/api/services/home.service';
import { useAuth } from '@/lib/auth';
import type { HomeScreenData } from '@/lib/domain/home.types';

export function useHomeScreenData() {
  const { isAuthenticated } = useAuth();

  return useQuery<HomeScreenData>({
    queryKey: queryKeys.home,
    queryFn: fetchHomeScreenData,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
    retry: 1,
    retryDelay: 800,
  });
}
