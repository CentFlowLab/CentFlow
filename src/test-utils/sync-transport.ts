import type { SyncEntity } from '@/core/sync';
import {
  SyncTransportError,
  type PullPage,
  type PushResult,
  type ServerCounts,
  type ServerRow,
  type SyncTransport,
  type VerifyResult,
} from '@/data/sync/transport';

import type { ServerSession } from './supabase-server';

export type TestTransport = SyncTransport & {
  online: boolean;
  /** Simula uma resposta perdida: o servidor aplica, mas o cliente recebe um erro de rede. */
  dropNextPushResponse: boolean;
  pushes: number;
};

/** Transporte que fala com o Supabase simulado (PGlite) com a identidade de um utilizador. */
export function createTestTransport(session: ServerSession): TestTransport {
  const guard = () => {
    if (!transport.online) throw new SyncTransportError('network');
  };
  const transport: TestTransport = {
    online: true,
    dropNextPushResponse: false,
    pushes: 0,
    async push(operations) {
      guard();
      transport.pushes += 1;
      const response = await session.rpc<{ results: PushResult[] }>('sync_push', {
        p_ops: operations,
      });
      if (transport.dropNextPushResponse) {
        transport.dropNextPushResponse = false;
        throw new SyncTransportError('network');
      }
      return response.results;
    },
    async pull(since, limit) {
      guard();
      return session.rpc<PullPage>('sync_pull_v3', { p_since: since, p_limit: limit });
    },
    async fetchRows(entity: SyncEntity, ids) {
      guard();
      const rows = await session.query<{ row: ServerRow }>(
        `select to_jsonb(t) - 'user_id' as row from public.${entity} t where t.id = any($1::uuid[])`,
        [ids],
      );
      return rows.map(({ row }) => row);
    },
    async counts() {
      guard();
      return session.rpc<ServerCounts>('sync_counts', {});
    },
    async verify(records) {
      guard();
      return session.rpc<VerifyResult[]>('sync_verify', { p_records: records });
    },
  };
  return transport;
}
