import type { QueryClient } from '@tanstack/react-query';

import {
  invalidateAllRemoteData,
  invalidateAssetsQueries,
  invalidateTransactionQueries,
} from '@/lib/api/invalidate-queries';
import { getSupabaseClient } from '@/lib/supabase/client';
import { isSupabaseEnabled } from '@/lib/supabase/config';

type SyncTable = 'transactions' | 'goals' | 'warranties' | 'inventory_items' | 'credits' | 'subscriptions';

const SYNC_TABLES: SyncTable[] = [
  'transactions',
  'goals',
  'warranties',
  'inventory_items',
  'credits',
  'subscriptions',
];

function invalidateForTable(table: SyncTable, queryClient: QueryClient): void {
  if (table === 'transactions') {
    invalidateTransactionQueries(queryClient);
    return;
  }
  if (table === 'credits' || table === 'subscriptions') {
    invalidateAssetsQueries(queryClient);
    void queryClient.invalidateQueries({ queryKey: ['liabilities'] });
    return;
  }
  invalidateAssetsQueries(queryClient);
}

/**
 * Subscrição Supabase Realtime por utilizador — invalida cache TanStack Query
 * quando dados mudam noutro dispositivo.
 */
export function subscribeToUserDataSync(
  userId: string,
  queryClient: QueryClient,
): () => void {
  if (!isSupabaseEnabled()) return () => {};

  try {
    const client = getSupabaseClient();
    let channel = client.channel(`centflow-sync-${userId}`);

    for (const table of SYNC_TABLES) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `user_id=eq.${userId}`,
        },
        () => invalidateForTable(table, queryClient),
      );
    }

    channel.subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}

export { invalidateAllRemoteData };
