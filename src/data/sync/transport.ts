import type { SyncEntity, SyncValue } from '@/core/sync';

/** Linha tal como o servidor a devolve (sem `user_id`). */
export type ServerRow = Record<string, SyncValue> & {
  id: string;
  version: number;
  server_seq: number;
  updated_at: string;
};

export type PushOperation = {
  op_id: string;
  tx_id: string | null;
  entity: SyncEntity;
  record_id: string;
  base_version: number;
  data: Record<string, SyncValue>;
};

export type PushResult =
  | { op_id: string; status: 'applied' | 'duplicate'; row: ServerRow }
  | { op_id: string; status: 'conflict'; reason: 'version' | 'missing'; row: ServerRow | null }
  | { op_id: string; status: 'rejected'; reason: string; code?: string }
  | { op_id: string; status: 'aborted' };

export type PullChange = { entity: SyncEntity; server_seq: number; row: ServerRow };

export type PullPage =
  | { reset_required: true; last_seq: number }
  | { reset_required: false; changes: PullChange[]; has_more: boolean; last_seq: number };

export type EntityCounts = { live: number; deleted: number };
export type ServerCounts = Record<SyncEntity, EntityCounts> & { last_seq: number };

export type VerifyResult = {
  entity: SyncEntity;
  id: string;
  version: number | null;
  deleted: boolean | null;
};

export type SyncTransportErrorKind = 'network' | 'auth' | 'server';

/** Falha de comunicação. Nunca transporta a mensagem original (pode conter dados). */
export class SyncTransportError extends Error {
  constructor(
    readonly kind: SyncTransportErrorKind,
    readonly code?: string,
  ) {
    super(`sync transport failed: ${kind}${code ? ` (${code})` : ''}`);
    this.name = 'SyncTransportError';
  }
}

/** Protocolo do servidor (ver `supabase/migrations/*_sync_functions.sql`). */
export interface SyncTransport {
  push(operations: readonly PushOperation[]): Promise<PushResult[]>;
  pull(since: number, limit: number): Promise<PullPage>;
  fetchRows(entity: SyncEntity, ids: readonly string[]): Promise<ServerRow[]>;
  counts(): Promise<ServerCounts>;
  verify(records: readonly { entity: SyncEntity; id: string }[]): Promise<VerifyResult[]>;
}
