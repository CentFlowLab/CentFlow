import { useCallback, useState } from 'react';

/**
 * Estado de pull-to-refresh controlado pelo utilizador.
 * Evita spinner preso quando o React Query refetch em background (isRefetching).
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return { refreshing, onRefresh };
}
