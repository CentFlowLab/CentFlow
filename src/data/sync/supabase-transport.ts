import type { SupabaseClient } from '@supabase/supabase-js';

import type { SyncEntity } from '@/core/sync';

import {
  SyncTransportError,
  type PullPage,
  type PushResult,
  type ServerCounts,
  type ServerRow,
  type SyncTransport,
  type VerifyResult,
} from './transport';

type PostgrestFailure = { code?: string; message?: string } | null;

/** Classifica a falha sem guardar a mensagem (pode citar valores do pedido). */
function toTransportError(error: PostgrestFailure, status: number): SyncTransportError {
  const code = error?.code || undefined;
  if (status === 401 || status === 403 || code === 'PGRST301' || code === '42501') {
    return new SyncTransportError('auth', code);
  }
  if (status === 0 || (!code && /fetch|network/i.test(error?.message ?? ''))) {
    return new SyncTransportError('network');
  }
  return new SyncTransportError('server', code);
}

async function call<T>(
  request: PromiseLike<{ data: unknown; error: PostgrestFailure; status: number }>,
): Promise<T> {
  let response: { data: unknown; error: PostgrestFailure; status: number };
  try {
    response = await request;
  } catch {
    throw new SyncTransportError('network');
  }
  if (response.error) throw toTransportError(response.error, response.status);
  return response.data as T;
}

function stripUser(row: Record<string, unknown>): ServerRow {
  const { user_id: _userId, ...rest } = row;
  return rest as ServerRow;
}

/** Protocolo de sincronização sobre as funções RPC do Supabase (sempre com RLS). */
export function createSupabaseTransport(client: SupabaseClient): SyncTransport {
  return {
    async push(operations) {
      const result = await call<{ results: PushResult[] }>(
        client.rpc('sync_push', { p_ops: operations }),
      );
      return result.results;
    },
    pull: (since, limit) =>
      call<PullPage>(client.rpc('sync_pull_v3', { p_since: since, p_limit: limit })),
    async fetchRows(entity: SyncEntity, ids) {
      const rows = await call<Record<string, unknown>[]>(
        client
          .from(entity)
          .select('*')
          .in('id', [...ids]),
      );
      return rows.map(stripUser);
    },
    counts: () => call<ServerCounts>(client.rpc('sync_counts')),
    verify: (records) => call<VerifyResult[]>(client.rpc('sync_verify', { p_records: records })),
  };
}
