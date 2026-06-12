import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { authService, useAuth } from '@/lib/auth';

export function useProfile() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => authService.getCurrentUser(),
    enabled: isAuthenticated,
    initialData: user ?? undefined,
    staleTime: 1000 * 60 * 10,
  });
}
