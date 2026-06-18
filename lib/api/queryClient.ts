import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { logAppError } from '@/lib/diagnostics';
import { setDiagnosticAction } from '@/lib/diagnostics/runtime-context';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      logAppError('react-query', error, {
        queryKey: query.queryKey,
        state: query.state.status,
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      const mutationKey = mutation.options.mutationKey?.join('.') ?? 'mutation';
      setDiagnosticAction(mutationKey);
      logAppError('react-query-mutation', error, {
        action: mutationKey,
        mutationKey: mutation.options.mutationKey ?? null,
        component: 'react-query',
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 30,
      retry: 2,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
