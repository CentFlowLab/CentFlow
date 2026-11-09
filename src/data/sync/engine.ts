import { mergeRecords, type SyncEntity } from '@/core/sync';

import {
  normalizeServerRow,
  syncFields,
  type ConflictResolution,
  type OutboxOperation,
  type SyncConflict,
  type SyncStore,
} from '../sqlite/sync-store';
import {
  SyncTransportError,
  type PushOperation,
  type ServerRow,
  type SyncTransport,
} from './transport';

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'authRequired';

export type SyncSnapshot = {
  status: SyncStatus;
  pending: number;
  conflicts: number;
  lastSyncedAt: string | null;
};

export type SyncEngineOptions = {
  store: SyncStore;
  transport: SyncTransport;
  /** Operações por pedido (o servidor aceita no máximo 500). */
  batchSize?: number;
  pageSize?: number;
};

const MAX_PUSH_ROUNDS = 20;

const recordKey = (entity: SyncEntity, id: string) => `${entity}:${id}`;

/** Divide em grupos atómicos (operações consecutivas com o mesmo `tx_id`). */
function groupsOf(operations: readonly OutboxOperation[]): OutboxOperation[][] {
  const groups: OutboxOperation[][] = [];
  for (const op of operations) {
    const current = groups.at(-1);
    if (current && op.txId !== null && current[0]!.txId === op.txId) current.push(op);
    else groups.push([op]);
  }
  return groups;
}

/** Motivos de rejeição conhecidos (triggers de integridade do servidor). */
export const REJECTION_CODES = [
  'account_unavailable',
  'category_unavailable',
  'category_type_mismatch',
  'currency_mismatch',
  'currency_locked',
  'account_in_use',
  'type_locked',
  'category_in_use',
  'duplicate_budget',
  'goal_unavailable',
] as const;
export type RejectionCode = (typeof REJECTION_CODES)[number] | 'invalid';

/** A mensagem do Postgres pode citar valores: só se guarda um código conhecido. */
function rejectionCode(reason: string): RejectionCode {
  return REJECTION_CODES.find((code) => reason === code) ?? 'invalid';
}

const toPushOperation = (op: OutboxOperation): PushOperation => ({
  op_id: op.opId,
  tx_id: op.txId,
  entity: op.entity,
  record_id: op.recordId,
  base_version: op.baseVersion,
  data: { ...op.data },
});

function statusFor(error: unknown): SyncStatus {
  if (error instanceof SyncTransportError) {
    return error.kind === 'network' ? 'offline' : error.kind === 'auth' ? 'authRequired' : 'error';
  }
  return 'error';
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;

/**
 * Sincronização de um espaço local com a conta: envia a fila de alterações (por ordem, em grupos
 * atómicos, idempotente por `op_id`), resolve conflitos por versão e recebe as alterações remotas.
 */
export function createSyncEngine({
  store,
  transport,
  batchSize = 200,
  pageSize = 500,
}: SyncEngineOptions) {
  let running: Promise<SyncSnapshot> | null = null;
  let again = false;
  let status: SyncStatus = 'idle';
  const listeners = new Set<(snapshot: SyncSnapshot) => void>();

  async function snapshot(): Promise<SyncSnapshot> {
    const [pending, conflicts, state] = await Promise.all([
      store.pendingCount(),
      store.openConflictCount(),
      store.state(),
    ]);
    return { status, pending, conflicts, lastSyncedAt: state.lastSyncedAt };
  }

  async function publish(next?: SyncStatus): Promise<SyncSnapshot> {
    if (next) status = next;
    const current = await snapshot();
    for (const listener of [...listeners]) listener(current);
    return current;
  }

  async function settleVersionConflict(op: OutboxOperation, raw: ServerRow): Promise<void> {
    const { entity, recordId } = op;
    const server = normalizeServerRow(raw);
    const serverFields = syncFields(entity, server);
    const [first] = await store.operationsFor(entity, recordId);
    const base = first?.base ?? null;
    const local = await store.localRow(entity, recordId);
    if (!local) {
      await store.settleRecord(entity, recordId, { server: raw });
      return;
    }
    const localFields = syncFields(entity, local);
    // Categoria base criada noutro dispositivo com o mesmo identificador fixo: adota-se a do servidor.
    if (entity === 'categories' && base === null && local.system_key !== null) {
      await store.settleRecord(entity, recordId, { server: raw });
      return;
    }
    const merge = mergeRecords(entity, base, localFields, serverFields);
    if (merge.kind === 'same') {
      await store.settleRecord(entity, recordId, { server: raw });
    } else if (merge.kind === 'merged') {
      await store.settleRecord(entity, recordId, { server: raw, merged: merge.data });
    } else {
      await store.settleRecord(entity, recordId, {
        server: raw,
        conflict: {
          entity,
          recordId,
          reason: 'version',
          detail: merge.fields.join(','),
          base,
          local: localFields,
          server: serverFields,
        },
      });
    }
  }

  async function settleMissing(op: OutboxOperation): Promise<void> {
    const local = await store.localRow(op.entity, op.recordId);
    if (!local || local.deleted_at !== null) {
      // Eliminado dos dois lados: nada se perde.
      await store.settleRecord(op.entity, op.recordId, { server: null });
      return;
    }
    const [first] = await store.operationsFor(op.entity, op.recordId);
    await store.settleRecord(op.entity, op.recordId, {
      server: null,
      conflict: {
        entity: op.entity,
        recordId: op.recordId,
        reason: 'missing',
        detail: null,
        base: first?.base ?? null,
        local: syncFields(op.entity, local),
        server: null,
      },
    });
  }

  /**
   * O objetivo só parte depois de o apagamento das contribuições estar confirmado,
   * quando não viajam no mesmo grupo. No mesmo grupo a ordem da fila chega.
   */
  function goalDeleteWaits(
    group: readonly OutboxOperation[],
    contributionDeletes: readonly { seq: number; txId: string | null; goalId: string }[],
  ): boolean {
    return group.some((op) => {
      if (op.entity !== 'goals' || op.data.deleted_at == null) return false;
      return contributionDeletes.some(
        (contribution) =>
          contribution.goalId === op.recordId &&
          contribution.seq < op.seq &&
          contribution.txId !== op.txId,
      );
    });
  }

  /**
   * A categoria só parte depois de o apagamento do orçamento estar confirmado.
   * No mesmo grupo atómico a ordem da fila chega: o orçamento é aplicado primeiro.
   */
  function categoryDeleteWaits(
    group: readonly OutboxOperation[],
    budgetDeletes: readonly { seq: number; txId: string | null; categoryId: string }[],
  ): boolean {
    return group.some((op) => {
      if (op.entity !== 'categories' || op.data.deleted_at == null) return false;
      return budgetDeletes.some(
        (budget) =>
          budget.categoryId === op.recordId && budget.seq < op.seq && budget.txId !== op.txId,
      );
    });
  }

  /**
   * Uma ronda de envio, por ordem da fila. Devolve `true` se alguma operação ficou resolvida.
   *
   * Cada registo envia no máximo uma alteração por ronda: a seguinte só parte depois de a
   * anterior estar confirmada, para que um conflito nunca seja contornado por uma alteração
   * posterior cuja versão base coincida por acaso com a do servidor. Grupos que tocam registos
   * bloqueados (rejeitados ou abortados) são saltados para não travarem o resto da fila.
   */
  async function pushRound(): Promise<boolean> {
    const seen = new Set<string>();
    const stuck = new Set<string>();
    const budgetDeletes = await store.pendingBudgetDeletes();
    const contributionDeletes = await store.pendingContributionDeletes();
    let after = 0;
    let progressed = false;
    for (;;) {
      const candidates = await store.nextBatch(after, batchSize);
      if (candidates.length === 0) return progressed;
      const batch: OutboxOperation[] = [];
      let examined = after;
      let repeated = false;
      for (const group of groupsOf(candidates)) {
        const keys = group.map((op) => recordKey(op.entity, op.recordId));
        if (keys.some((key) => stuck.has(key))) {
          for (const key of keys) stuck.add(key);
          examined = group.at(-1)!.seq;
          continue;
        }
        if (
          categoryDeleteWaits(group, budgetDeletes) ||
          goalDeleteWaits(group, contributionDeletes)
        ) {
          examined = group.at(-1)!.seq;
          continue;
        }
        if (keys.some((key) => seen.has(key))) {
          repeated = true;
          break;
        }
        for (const key of keys) seen.add(key);
        batch.push(...group);
        examined = group.at(-1)!.seq;
      }
      after = examined;
      if (batch.length === 0) {
        // Só restam alterações de registos já enviados nesta ronda: seguem na próxima.
        if (repeated) return progressed;
        continue;
      }

      const results = new Map(
        (await transport.push(batch.map(toPushOperation))).map((result) => [result.op_id, result]),
      );
      const settled = new Set<string>();
      const retry: string[] = [];
      for (const op of batch) {
        const key = recordKey(op.entity, op.recordId);
        if (settled.has(key)) continue;
        const result = results.get(op.opId);
        if (!result || result.status === 'aborted') {
          retry.push(op.opId);
          stuck.add(key);
        } else if (result.status === 'applied' || result.status === 'duplicate') {
          await store.acknowledge(op, normalizeServerRow(result.row));
          progressed = true;
        } else if (result.status === 'rejected') {
          await store.recordRejection(op, rejectionCode(result.reason));
          stuck.add(key);
        } else if (result.status === 'conflict' && result.reason === 'missing') {
          await settleMissing(op);
          settled.add(key);
          progressed = true;
        } else if (result.row) {
          await settleVersionConflict(op, result.row);
          settled.add(key);
          progressed = true;
        } else {
          retry.push(op.opId);
          stuck.add(key);
        }
      }
      await store.recordAttempt(retry, 'aborted');
    }
  }

  /** Recebe as alterações remotas. Devolve `false` se o servidor exigir ressincronização. */
  async function pull(fullResync: boolean): Promise<boolean> {
    let since: number;
    if (fullResync) {
      await store.clearInbox();
      since = 0;
    } else {
      const [state, staged] = await Promise.all([store.state(), store.stagedThrough()]);
      since = Math.max(state.pullCursor, staged ?? 0);
    }
    for (;;) {
      const page = await transport.pull(since, pageSize);
      if (page.reset_required) {
        await store.clearInbox();
        return false;
      }
      await store.stage(page.changes);
      const last = page.changes.at(-1);
      if (last) since = last.server_seq;
      if (!page.has_more) {
        // `last_seq` vem do mesmo instantâneo: nada abaixo dele ficou por receber.
        since = Math.max(since, page.last_seq);
        break;
      }
    }
    await store.applyInbox({ cursor: since, fullResync });
    return true;
  }

  /** Confirma que a cópia local coincide com o servidor quando já não há nada por enviar. */
  async function countsMatch(): Promise<boolean> {
    if ((await store.pendingCount()) > 0) return true;
    const [server, local, state] = await Promise.all([
      transport.counts(),
      store.localCounts(),
      store.state(),
    ]);
    if (server.last_seq !== state.pullCursor) return true;
    return (
      [
        'accounts',
        'categories',
        'budgets',
        'subscriptions',
        'goals',
        'goal_contributions',
        'wealth_items',
        'entries',
      ] as const
    ).every((entity) => {
      // Um servidor sem a migration desta entidade (ex.: `wealth_items`) não a conta: ignora-se até a migration existir.
      const remote = (server as Partial<typeof server>)[entity];
      if (remote === undefined) return true;
      return remote.live === local[entity].live && remote.deleted === local[entity].deleted;
    });
  }

  async function syncOnce(): Promise<void> {
    for (let round = 0; round < MAX_PUSH_ROUNDS; round += 1) {
      if (!(await pushRound())) break;
    }
    if (!(await pull(false)) || !(await countsMatch())) {
      await pull(true);
      for (let round = 0; round < MAX_PUSH_ROUNDS; round += 1) {
        if (!(await pushRound())) break;
      }
    }
    await store.markSynced();
  }

  async function run(): Promise<SyncSnapshot> {
    do {
      again = false;
      await publish('syncing');
      try {
        await syncOnce();
        status = 'idle';
      } catch (error) {
        status = statusFor(error);
        if (status === 'error' && !(error instanceof SyncTransportError)) {
          console.error(`[sync] failed: ${error instanceof Error ? error.name : 'unknown'}`);
        }
        again = false;
      }
    } while (again);
    return publish();
  }

  return {
    /** Sincroniza agora. Pedidos durante uma sincronização provocam uma nova ronda no fim. */
    sync(): Promise<SyncSnapshot> {
      if (running) {
        again = true;
        return running;
      }
      running = run().finally(() => {
        running = null;
      });
      return running;
    },

    snapshot,

    subscribe(listener: (snapshot: SyncSnapshot) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    listConflicts: (): Promise<SyncConflict[]> => store.listConflicts(),

    /**
     * Regista a decisão do utilizador sobre um conflito. Descartar uma alteração rejeitada de um
     * registo que já existe no servidor precisa de ligação (para obter a versão do servidor).
     */
    async resolveConflict(id: string, resolution: ConflictResolution): Promise<void> {
      const conflict = (await store.listConflicts()).find((item) => item.id === id);
      if (!conflict) return;
      let server: ServerRow | null = null;
      if (resolution === 'keepServer' && conflict.reason === 'rejected') {
        const local = await store.localRow(conflict.entity, conflict.recordId);
        if (local && local.version > 0) {
          const [row] = await transport.fetchRows(conflict.entity, [conflict.recordId]);
          server = row ?? null;
        }
      }
      await store.resolveConflict(conflict, resolution, { server });
      await publish();
    },
  };
}
