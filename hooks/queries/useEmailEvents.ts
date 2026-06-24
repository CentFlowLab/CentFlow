import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { useAuth } from '@/lib/auth';
import { fetchEmailEvents } from '@/lib/email/events.service';
import { isDiagnosticsEnabled } from '@/lib/diagnostics';

export function useEmailEvents() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.emailEvents(user?.id ?? ''),
    queryFn: () => fetchEmailEvents(user!.id),
    enabled: isAuthenticated && !!user?.id && isDiagnosticsEnabled(),
    staleTime: 1000 * 30,
  });
}
