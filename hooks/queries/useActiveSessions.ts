import { useQuery } from '@tanstack/react-query';

import { getActiveSessions } from '@/lib/api/services/profile.service';
import { useAuth } from '@/lib/auth';

export function useActiveSessions() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['active-sessions'],
    queryFn: getActiveSessions,
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
  });
}
