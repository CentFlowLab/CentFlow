import { SYNC_FIELDS, type SyncEntity, type SyncRecord, type SyncValue } from '@/core/sync';
import { normalizeSearchText } from '@/core/text/search';

import type { SqlDatabase, SqlExecutor } from '../db/sql-database';
import type { DataEntity } from '../repositories/types';
import type { PullChange, ServerRow } from '../sync/transport';

/** Ordem de aplicação: uma linha nunca chega antes daquilo de que depende. */
/** Categorias antes de orçamentos; orçamentos antes de serem apagados com as categorias. */
export const SYNC_ENTITIES: readonly SyncEntity[] = [
  'accounts',
  'categories',
  'budgets',
  'subscriptions',
  'goals',
  'goal_contributions',
  'wealth_items',
  'vehicles',
  'documents',
  'entries',
];

export type OutboxOperation = {
  seq: number;
  opId: string;
  txId: string | null;
  entity: SyncEntity;
  recordId: string;
  baseVersion: number;
  base: SyncRecord | null;
  data: SyncRecord;
  attempts: number;
};

export type ConflictReason = 'version' | 'missing' | 'rejected';
export type ConflictResolution = 'keepLocal' | 'keepServer';

export type SyncConflict = {
  id: string;
  entity: SyncEntity;
  recordId: string;
  reason: ConflictReason;
  /** Campos em conflito ou código de rejeição do servidor. */
  detail: string | null;
  base: SyncRecord | null;
  local: SyncRecord | null;
  server: SyncRecord | null;
  createdAt: string;
};

export type NewConflict = Omit<SyncConflict, 'id' | 'createdAt'>;

export type SyncStateRow = {
  tracking: boolean;
  ownerUserId: string | null;
  pullCursor: number;
  lastSyncedAt: string | null;
};

export type LocalCounts = Record<SyncEntity, { live: number; deleted: number }>;

/** Colunas guardadas localmente para cada entidade, além de `search_text` (derivado). */
const COLUMNS: Record<SyncEntity, readonly string[]> = {
  accounts: [
    'id',
    'name',
    'type',
    'currency',
    'initial_balance',
    'archived_at',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  categories: [
    'id',
    'name',
    'type',
    'icon',
    'color',
    'system_key',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  budgets: [
    'id',
    'category_id',
    'amount',
    'currency',
    'period',
    'starts_on',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  subscriptions: [
    'id',
    'name',
    'amount',
    'currency',
    'period',
    'status',
    'starts_on',
    'next_on',
    'category_id',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  goals: [
    'id',
    'name',
    'target_amount',
    'currency',
    'target_on',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  goal_contributions: ['id', 'goal_id', 'amount', 'date', 'created_at', 'updated_at', 'deleted_at'],
  vehicles: [
    'id',
    'name',
    'kind',
    'plate',
    'odometer_km',
    'inspection_due',
    'insurance_due',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  documents: [
    'id',
    'title',
    'category',
    'expires_on',
    'notes',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  wealth_items: [
    'id',
    'name',
    'type',
    'amount',
    'currency',
    'valued_on',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  entries: [
    'id',
    'type',
    'amount',
    'description',
    'notes',
    'category_id',
    'account_id',
    'destination_account_id',
    'date',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
};

const TIMESTAMPS = new Set(['created_at', 'updated_at', 'deleted_at', 'archived_at']);

/** O Postgres devolve `timestamptz` com fuso e microssegundos; localmente usa-se ISO UTC. */
function normalizeTimestamp(value: SyncValue): SyncValue {
  if (typeof value !== 'string') return value;
  const time = Date.parse(value);
  return Number.isNaN(time) ? value : new Date(time).toISOString();
}

export function normalizeServerRow(row: ServerRow): ServerRow {
  const normalized: Record<string, SyncValue> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key] = TIMESTAMPS.has(key) ? normalizeTimestamp(value) : value;
  }
  return normalized as ServerRow;
}

/** Os campos sincronizados de uma linha (local ou do servidor). */
export function syncFields(entity: SyncEntity, row: Readonly<Record<string, unknown>>): SyncRecord {
  const record: Record<string, SyncValue> = {};
  for (const field of SYNC_FIELDS[entity]) record[field] = (row[field] ?? null) as SyncValue;
  return record;
}

function parseJson(value: string | null): SyncRecord | null {
  return value === null ? null : (JSON.parse(value) as SyncRecord);
}

async function asRemote<T>(tx: SqlExecutor, task: () => Promise<T>): Promise<T> {
  await tx.run('UPDATE sync_state SET applying_remote = 1 WHERE id = 1');
  const result = await task();
  await tx.run('UPDATE sync_state SET applying_remote = 0 WHERE id = 1');
  return result;
}

type Options = {
  now: () => string;
  newId: () => string;
  notify: (entities: readonly DataEntity[]) => void;
};

export type SyncStore = ReturnType<typeof createSyncStore>;

/** Acesso SQL da sincronização: fila de envio, receção, conflitos e aplicação de linhas. */
export function createSyncStore(db: SqlDatabase, { now, newId, notify }: Options) {
  /** Escreve a linha do servidor localmente, sem a registar para envio. */
  async function writeServerRow(
    tx: SqlExecutor,
    entity: SyncEntity,
    raw: ServerRow,
    { force }: { force: boolean },
  ): Promise<boolean> {
    const row = normalizeServerRow(raw);
    // Outro limite ativo da mesma categoria cede o lugar à linha do servidor. A operação
    // pendente desse limite, se existir, fica na fila e o conflito conserva a versão local.
    if (entity === 'budgets' && row.deleted_at == null && row.category_id != null) {
      await tx.run(
        `UPDATE budgets SET deleted_at = ?, updated_at = ?
          WHERE category_id = ? AND deleted_at IS NULL AND id <> ?`,
        [now(), now(), row.category_id, row.id],
      );
    }
    const columns = [...COLUMNS[entity], 'version', 'server_seq', 'synced_at'];
    const values: SyncValue[] = [
      ...COLUMNS[entity].map((column) => row[column] ?? null),
      row.version,
      row.server_seq,
      now(),
    ];
    if (entity === 'entries') {
      columns.push('search_text');
      values.push(normalizeSearchText(String(row.description ?? '')));
    }
    const updates = columns
      .filter((column) => column !== 'id')
      .map((column) => `${column} = excluded.${column}`);
    const guard = force
      ? ''
      : `WHERE excluded.version >= ${entity}.version
           AND NOT EXISTS (SELECT 1 FROM sync_outbox o
                            WHERE o.entity = '${entity}' AND o.record_id = excluded.id)`;
    const result = await tx.run(
      `INSERT INTO ${entity} (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})
       ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')} ${guard}`,
      values,
    );
    return result.changes > 0;
  }

  /** Atualização registada para envio (o trigger cria a operação com base na versão atual). */
  async function writeTracked(
    tx: SqlExecutor,
    entity: SyncEntity,
    id: string,
    data: SyncRecord,
  ): Promise<void> {
    if (entity === 'budgets' && (data.deleted_at ?? null) === null && data.category_id != null) {
      await tx.run(
        `UPDATE budgets SET deleted_at = ?, updated_at = ?
          WHERE category_id = ? AND deleted_at IS NULL AND id <> ?`,
        [now(), now(), data.category_id, id],
      );
    }
    const fields = SYNC_FIELDS[entity];
    const assignments = fields.map((field) => `${field} = ?`);
    const values: SyncValue[] = fields.map((field) => data[field] ?? null);
    if (entity === 'entries') {
      assignments.push('search_text = ?');
      values.push(normalizeSearchText(String(data.description ?? '')));
    }
    await tx.run(`UPDATE ${entity} SET ${assignments.join(', ')}, updated_at = ? WHERE id = ?`, [
      ...values,
      now(),
      id,
    ]);
  }

  async function insertConflict(tx: SqlExecutor, conflict: NewConflict): Promise<void> {
    await tx.run(
      `INSERT INTO sync_conflicts
         (id, entity, record_id, reason, detail, base_data, local_data, server_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId(),
        conflict.entity,
        conflict.recordId,
        conflict.reason,
        conflict.detail,
        conflict.base ? JSON.stringify(conflict.base) : null,
        conflict.local ? JSON.stringify(conflict.local) : null,
        conflict.server ? JSON.stringify(conflict.server) : null,
        now(),
      ],
    );
  }

  async function localRow(
    executor: SqlExecutor,
    entity: SyncEntity,
    id: string,
  ): Promise<(SyncRecord & { version: number }) | null> {
    const row = await executor.first<Record<string, SyncValue> & { version: number }>(
      `SELECT * FROM ${entity} WHERE id = ?`,
      [id],
    );
    return row ? { ...syncFields(entity, row), version: row.version } : null;
  }

  type OutboxRow = {
    seq: number;
    op_id: string;
    tx_id: string | null;
    entity: SyncEntity;
    record_id: string;
    base_version: number;
    base: string | null;
    data: string;
    attempts: number;
  };

  const toOperation = (row: OutboxRow): OutboxOperation => ({
    seq: row.seq,
    opId: row.op_id,
    txId: row.tx_id,
    entity: row.entity,
    recordId: row.record_id,
    baseVersion: row.base_version,
    base: parseJson(row.base),
    data: parseJson(row.data)!,
    attempts: row.attempts,
  });

  return {
    async state(): Promise<SyncStateRow> {
      const row = await db.first<{
        tracking: number;
        owner_user_id: string | null;
        pull_cursor: number;
        last_synced_at: string | null;
      }>(
        'SELECT tracking, owner_user_id, pull_cursor, last_synced_at FROM sync_state WHERE id = 1',
      );
      return {
        tracking: row?.tracking === 1,
        ownerUserId: row?.owner_user_id ?? null,
        pullCursor: row?.pull_cursor ?? 0,
        lastSyncedAt: row?.last_synced_at ?? null,
      };
    },

    /** A partir daqui, todas as escritas locais são registadas para envio. */
    async enableTracking(ownerUserId: string): Promise<void> {
      await db.run('UPDATE sync_state SET tracking = 1, owner_user_id = ? WHERE id = 1', [
        ownerUserId,
      ]);
    },

    async pendingCount(): Promise<number> {
      const row = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM sync_outbox');
      return row?.n ?? 0;
    },

    /** Apagamentos de orçamento ainda por confirmar, para não os ultrapassar. */
    async pendingBudgetDeletes(): Promise<
      { seq: number; txId: string | null; categoryId: string }[]
    > {
      const rows = await db.all<{ seq: number; tx_id: string | null; category_id: string }>(
        `SELECT seq, tx_id, json_extract(data, '$.category_id') AS category_id
           FROM sync_outbox
          WHERE entity = 'budgets'
            AND json_type(data, '$.deleted_at') = 'text'
          ORDER BY seq`,
      );
      return rows
        .filter((row) => row.category_id != null)
        .map((row) => ({ seq: row.seq, txId: row.tx_id, categoryId: row.category_id }));
    },

    /** Apagamentos de contribuição ainda por confirmar, para não ultrapassar o do objetivo. */
    async pendingContributionDeletes(): Promise<
      { seq: number; txId: string | null; goalId: string }[]
    > {
      const rows = await db.all<{ seq: number; tx_id: string | null; goal_id: string }>(
        `SELECT seq, tx_id, json_extract(data, '$.goal_id') AS goal_id
           FROM sync_outbox
          WHERE entity = 'goal_contributions'
            AND json_type(data, '$.deleted_at') = 'text'
          ORDER BY seq`,
      );
      return rows
        .filter((row) => row.goal_id != null)
        .map((row) => ({ seq: row.seq, txId: row.tx_id, goalId: row.goal_id }));
    },

    async openConflictCount(): Promise<number> {
      const row = await db.first<{ n: number }>(
        'SELECT COUNT(*) AS n FROM sync_conflicts WHERE resolved_at IS NULL',
      );
      return row?.n ?? 0;
    },

    /** Próximas operações por ordem, sem partir um grupo atómico (`tx_id`). */
    async nextBatch(afterSeq: number, max: number): Promise<OutboxOperation[]> {
      const rows = await db.all<OutboxRow>(
        'SELECT * FROM sync_outbox WHERE seq > ? ORDER BY seq LIMIT ?',
        [afterSeq, max],
      );
      const last = rows.at(-1);
      if (last?.tx_id && rows.length === max) {
        rows.push(
          ...(await db.all<OutboxRow>(
            'SELECT * FROM sync_outbox WHERE seq > ? AND tx_id = ? ORDER BY seq',
            [last.seq, last.tx_id],
          )),
        );
      }
      return rows.map(toOperation);
    },

    async operationsFor(entity: SyncEntity, recordId: string): Promise<OutboxOperation[]> {
      const rows = await db.all<OutboxRow>(
        'SELECT * FROM sync_outbox WHERE entity = ? AND record_id = ? ORDER BY seq',
        [entity, recordId],
      );
      return rows.map(toOperation);
    },

    localRow: (entity: SyncEntity, id: string) => localRow(db, entity, id),

    /** Operação confirmada pelo servidor: sai da fila e a linha fica com a versão do servidor. */
    async acknowledge(operation: OutboxOperation, row: ServerRow): Promise<void> {
      await db.transaction(async (tx) => {
        await asRemote(tx, async () => {
          await tx.run('DELETE FROM sync_outbox WHERE op_id = ?', [operation.opId]);
          await tx.run(
            `UPDATE ${operation.entity}
                SET version = MAX(version, ?), server_seq = ?, synced_at = ?
              WHERE id = ?`,
            [row.version, row.server_seq, now(), operation.recordId],
          );
          await tx.run(
            `UPDATE sync_conflicts SET resolved_at = ?, resolution = 'keepLocal'
              WHERE entity = ? AND record_id = ? AND reason = 'rejected' AND resolved_at IS NULL`,
            [now(), operation.entity, operation.recordId],
          );
        });
      });
    },

    async recordAttempt(opIds: readonly string[], error: string | null): Promise<void> {
      if (opIds.length === 0) return;
      await db.run(
        `UPDATE sync_outbox SET attempts = attempts + 1, last_error = ?
          WHERE op_id IN (${opIds.map(() => '?').join(', ')})`,
        [error, ...opIds],
      );
    },

    /** Rejeição pelo servidor: a alteração fica na fila e é registado um conflito (um por registo). */
    async recordRejection(operation: OutboxOperation, code: string): Promise<void> {
      await db.transaction(async (tx) => {
        await tx.run(
          `UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE op_id = ?`,
          [code, operation.opId],
        );
        const open = await tx.first(
          `SELECT 1 FROM sync_conflicts
            WHERE entity = ? AND record_id = ? AND reason = 'rejected' AND resolved_at IS NULL`,
          [operation.entity, operation.recordId],
        );
        if (open) return;
        await insertConflict(tx, {
          entity: operation.entity,
          recordId: operation.recordId,
          reason: 'rejected',
          detail: code,
          base: operation.base,
          local: await localRow(tx, operation.entity, operation.recordId).then((row) =>
            row ? syncFields(operation.entity, row) : null,
          ),
          server: null,
        });
      });
      notify([operation.entity]);
    },

    /**
     * Substitui as alterações pendentes de um registo pela versão do servidor (ou pela ausência
     * dela), opcionalmente preservando um conflito e reaplicando uma fusão por cima.
     */
    async settleRecord(
      entity: SyncEntity,
      recordId: string,
      {
        server,
        conflict,
        merged,
      }: { server: ServerRow | null; conflict?: NewConflict; merged?: SyncRecord },
    ): Promise<void> {
      await db.transaction(async (tx) => {
        await asRemote(tx, async () => {
          await tx.run('DELETE FROM sync_outbox WHERE entity = ? AND record_id = ?', [
            entity,
            recordId,
          ]);
          if (server) {
            await writeServerRow(tx, entity, server, { force: true });
          } else {
            await tx.run(
              `UPDATE ${entity} SET deleted_at = COALESCE(deleted_at, ?), updated_at = ? WHERE id = ?`,
              [now(), now(), recordId],
            );
          }
          if (conflict) await insertConflict(tx, conflict);
        });
        if (merged) await writeTracked(tx, entity, recordId, merged);
      });
      notify([entity]);
    },

    /** Guarda alterações recebidas até a leitura terminar; permite retomar após interrupção. */
    async stage(changes: readonly PullChange[]): Promise<void> {
      if (changes.length === 0) return;
      await db.transaction(async (tx) => {
        for (const change of changes) {
          await tx.run(
            'INSERT OR REPLACE INTO sync_inbox (server_seq, entity, data) VALUES (?, ?, ?)',
            [change.server_seq, change.entity, JSON.stringify(change.row)],
          );
        }
      });
    },

    async stagedThrough(): Promise<number | null> {
      const row = await db.first<{ seq: number | null }>(
        'SELECT MAX(server_seq) AS seq FROM sync_inbox',
      );
      return row?.seq ?? null;
    },

    async clearInbox(): Promise<void> {
      await db.run('DELETE FROM sync_inbox');
    },

    /**
     * Aplica tudo o que foi recebido numa única transação e avança o cursor. Registos com
     * alterações locais pendentes não são tocados: o envio trata deles (conflito ou fusão).
     * Numa ressincronização completa, remove ainda o que já não existe no servidor.
     */
    async applyInbox({
      cursor,
      fullResync,
    }: {
      cursor: number;
      fullResync: boolean;
    }): Promise<number> {
      let applied = 0;
      await db.transaction(async (tx) => {
        await tx.exec('PRAGMA defer_foreign_keys = ON;');
        await asRemote(tx, async () => {
          for (const entity of SYNC_ENTITIES) {
            const rows = await tx.all<{ data: string }>(
              'SELECT data FROM sync_inbox WHERE entity = ? ORDER BY server_seq',
              [entity],
            );
            for (const { data } of rows) {
              if (await writeServerRow(tx, entity, JSON.parse(data) as ServerRow, { force: false }))
                applied += 1;
            }
          }
          if (fullResync) {
            for (const entity of [...SYNC_ENTITIES].reverse()) {
              const unseen = `${entity}.id NOT IN (SELECT json_extract(data, '$.id')
                                FROM sync_inbox WHERE entity = '${entity}')
                AND NOT EXISTS (SELECT 1 FROM sync_outbox o
                                 WHERE o.entity = '${entity}' AND o.record_id = ${entity}.id)`;
              const referenced =
                entity === 'accounts'
                  ? `AND NOT EXISTS (SELECT 1 FROM entries e
                       WHERE e.account_id = accounts.id OR e.destination_account_id = accounts.id)`
                  : entity === 'categories'
                    ? `AND NOT EXISTS (SELECT 1 FROM entries e WHERE e.category_id = categories.id)
                       AND NOT EXISTS (SELECT 1 FROM budgets b WHERE b.category_id = categories.id)`
                    : entity === 'goals'
                      ? `AND NOT EXISTS (SELECT 1 FROM goal_contributions c
                          WHERE c.goal_id = goals.id)`
                      : '';
              // Já confirmadas e purgadas no servidor: a eliminação foi definitiva.
              const purged = await tx.run(
                `DELETE FROM ${entity} WHERE version > 0 AND ${unseen} ${referenced}`,
              );
              applied += purged.changes;
            }
          }
        });
        if (fullResync) {
          // Nunca enviadas (sem versão do servidor): voltam à fila para não se perderem.
          for (const entity of SYNC_ENTITIES) {
            await tx.run(
              `UPDATE ${entity} SET updated_at = updated_at
                WHERE version = 0
                  AND NOT EXISTS (SELECT 1 FROM sync_outbox o
                                   WHERE o.entity = '${entity}' AND o.record_id = ${entity}.id)`,
            );
          }
        }
        await tx.run('DELETE FROM sync_inbox');
        await tx.run('UPDATE sync_state SET pull_cursor = ?, last_synced_at = ? WHERE id = 1', [
          cursor,
          now(),
        ]);
      });
      if (applied > 0) notify(SYNC_ENTITIES);
      return applied;
    },

    async resetCursor(): Promise<void> {
      await db.run('UPDATE sync_state SET pull_cursor = 0 WHERE id = 1');
    },

    async markSynced(): Promise<void> {
      await db.run('UPDATE sync_state SET last_synced_at = ? WHERE id = 1', [now()]);
    },

    async localCounts(): Promise<LocalCounts> {
      const counts = {} as LocalCounts;
      for (const entity of SYNC_ENTITIES) {
        const row = await db.first<{ live: number; deleted: number }>(
          `SELECT COUNT(*) FILTER (WHERE deleted_at IS NULL) AS live,
                  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS deleted
             FROM ${entity}`,
        );
        counts[entity] = { live: row?.live ?? 0, deleted: row?.deleted ?? 0 };
      }
      return counts;
    },

    async listConflicts(): Promise<SyncConflict[]> {
      const rows = await db.all<{
        id: string;
        entity: SyncEntity;
        record_id: string;
        reason: ConflictReason;
        detail: string | null;
        base_data: string | null;
        local_data: string | null;
        server_data: string | null;
        created_at: string;
      }>('SELECT * FROM sync_conflicts WHERE resolved_at IS NULL ORDER BY created_at, rowid');
      return rows.map((row) => ({
        id: row.id,
        entity: row.entity,
        recordId: row.record_id,
        reason: row.reason,
        detail: row.detail,
        base: parseJson(row.base_data),
        local: parseJson(row.local_data),
        server: parseJson(row.server_data),
        createdAt: row.created_at,
      }));
    },

    /**
     * Regista a decisão. `keepLocal` reaplica a versão local por cima da atual (nova operação com
     * base na versão do servidor; se o registo já não existir no servidor, volta a ser criado).
     */
    async resolveConflict(
      conflict: SyncConflict,
      resolution: ConflictResolution,
      { server }: { server?: ServerRow | null } = {},
    ): Promise<void> {
      await db.transaction(async (tx) => {
        await tx.run(
          `UPDATE sync_conflicts SET resolved_at = ?, resolution = ?
            WHERE id = ? AND resolved_at IS NULL`,
          [now(), resolution, conflict.id],
        );
        if (resolution === 'keepLocal' && conflict.local) {
          await tx.run('DELETE FROM sync_outbox WHERE entity = ? AND record_id = ?', [
            conflict.entity,
            conflict.recordId,
          ]);
          if (conflict.reason === 'missing') {
            await asRemote(tx, () =>
              tx.run(`UPDATE ${conflict.entity} SET version = 0, server_seq = NULL WHERE id = ?`, [
                conflict.recordId,
              ]),
            );
          }
          await writeTracked(tx, conflict.entity, conflict.recordId, conflict.local);
        }
        if (resolution === 'keepServer' && conflict.reason === 'rejected') {
          await asRemote(tx, async () => {
            await tx.run('DELETE FROM sync_outbox WHERE entity = ? AND record_id = ?', [
              conflict.entity,
              conflict.recordId,
            ]);
            if (server) {
              await writeServerRow(tx, conflict.entity, server, { force: true });
            } else {
              await tx.run(
                `UPDATE ${conflict.entity}
                    SET deleted_at = COALESCE(deleted_at, ?), updated_at = ? WHERE id = ?`,
                [now(), now(), conflict.recordId],
              );
            }
          });
        }
      });
      notify([conflict.entity]);
    },
  };
}
