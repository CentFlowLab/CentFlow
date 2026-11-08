import type { SyncEntity } from '@/core/sync';

import type { SqlDatabase, SqlValue } from '../db/sql-database';
import { SYNC_ENTITIES } from './sync-store';

export type ImportRecord = { entity: SyncEntity; id: string };

export type ImportState =
  | { state: 'none' }
  | { state: 'declined' }
  /** Copiado para a conta, ainda não confirmado pelo servidor: pode ser cancelado. */
  | { state: 'copied'; records: ImportRecord[] }
  /** Confirmado no servidor; `sourceCleared` indica se a cópia sem conta já foi limpa. */
  | { state: 'confirmed'; records: ImportRecord[]; sourceCleared: boolean };

const META_KEY = 'import.anonymous';

const COPY_COLUMNS: Record<SyncEntity, readonly string[]> = {
  accounts: [
    'id',
    'name',
    'type',
    'currency',
    'initial_balance',
    'archived_at',
    'created_at',
    'updated_at',
  ],
  categories: ['id', 'name', 'type', 'icon', 'color', 'system_key', 'created_at', 'updated_at'],
  entries: [
    'id',
    'type',
    'amount',
    'description',
    'search_text',
    'notes',
    'category_id',
    'account_id',
    'destination_account_id',
    'date',
    'created_at',
    'updated_at',
  ],
};

export async function readImportState(db: SqlDatabase): Promise<ImportState> {
  const row = await db.first<{ value: string }>('SELECT value FROM meta WHERE key = ?', [META_KEY]);
  return row ? (JSON.parse(row.value) as ImportState) : { state: 'none' };
}

export async function writeImportState(db: SqlDatabase, state: ImportState): Promise<void> {
  await db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [
    META_KEY,
    JSON.stringify(state),
  ]);
}

/** Há dados criados pelo utilizador no espaço sem conta (as categorias base não contam). */
export async function hasUserData(db: SqlDatabase): Promise<boolean> {
  const row = await db.first<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM accounts WHERE deleted_at IS NULL)
          + (SELECT COUNT(*) FROM entries WHERE deleted_at IS NULL)
          + (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL AND system_key IS NULL) AS n`,
  );
  return (row?.n ?? 0) > 0;
}

/**
 * Copia os registos ativos do espaço sem conta para o espaço da conta, numa única transação
 * (registada para envio). Registos já presentes (mesmo id) não são tocados. Devolve os registos
 * efetivamente copiados e guarda-os para confirmação, retoma ou cancelamento.
 */
export async function copyRecords(
  source: SqlDatabase,
  target: SqlDatabase,
): Promise<ImportRecord[]> {
  const rows: Record<SyncEntity, Record<string, SqlValue>[]> = {
    accounts: [],
    categories: [],
    entries: [],
  };
  for (const entity of SYNC_ENTITIES) {
    rows[entity] = await source.all<Record<string, SqlValue>>(
      `SELECT ${COPY_COLUMNS[entity].join(', ')} FROM ${entity} WHERE deleted_at IS NULL
        ORDER BY created_at, rowid`,
    );
  }
  return target.transaction(async (tx) => {
    const copied: ImportRecord[] = [];
    for (const entity of SYNC_ENTITIES) {
      const columns = COPY_COLUMNS[entity];
      for (const row of rows[entity]) {
        const result = await tx.run(
          `INSERT OR IGNORE INTO ${entity} (${columns.join(', ')})
           VALUES (${columns.map(() => '?').join(', ')})`,
          columns.map((column) => row[column] ?? null),
        );
        if (result.changes > 0) copied.push({ entity, id: String(row.id) });
      }
    }
    const state: ImportState = { state: 'copied', records: copied };
    await tx.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [
      META_KEY,
      JSON.stringify(state),
    ]);
    return copied;
  });
}

/** Quantos dos registos importados ainda têm alterações por enviar ou conflitos por resolver. */
export async function unsettledCount(db: SqlDatabase, records: ImportRecord[]): Promise<number> {
  let count = 0;
  for (const { entity, id } of records) {
    const row = await db.first<{ n: number }>(
      `SELECT (SELECT COUNT(*) FROM sync_outbox WHERE entity = ? AND record_id = ?)
            + (SELECT COUNT(*) FROM sync_conflicts
                WHERE entity = ? AND record_id = ? AND resolved_at IS NULL) AS n`,
      [entity, id, entity, id],
    );
    count += row?.n ?? 0;
  }
  return count;
}

function byEntity(records: ImportRecord[], entity: SyncEntity): string[] {
  return records.filter((record) => record.entity === entity).map((record) => record.id);
}

/** Depois da confirmação: remove do espaço sem conta exatamente o que foi importado. */
export async function clearImportedFromSource(
  source: SqlDatabase,
  records: ImportRecord[],
): Promise<void> {
  await source.transaction(async (tx) => {
    for (const entity of [...SYNC_ENTITIES].reverse()) {
      const guard =
        entity === 'accounts'
          ? `AND NOT EXISTS (SELECT 1 FROM entries e
               WHERE e.account_id = accounts.id OR e.destination_account_id = accounts.id)`
          : entity === 'categories'
            ? `AND system_key IS NULL
               AND NOT EXISTS (SELECT 1 FROM entries e WHERE e.category_id = categories.id)`
            : '';
      for (const id of byEntity(records, entity)) {
        await tx.run(`DELETE FROM ${entity} WHERE id = ? ${guard}`, [id]);
      }
    }
  });
}

/**
 * Desfaz uma importação ainda não confirmada: o que nunca saiu do dispositivo é removido; o que
 * já chegou ao servidor é eliminado (e essa eliminação sincroniza). O espaço sem conta nunca foi
 * alterado, por isso nada se perde.
 */
export async function revertCopy(target: SqlDatabase, records: ImportRecord[]): Promise<void> {
  await target.transaction(async (tx) => {
    const now = new Date().toISOString();
    for (const entity of [...SYNC_ENTITIES].reverse()) {
      for (const id of byEntity(records, entity)) {
        const row = await tx.first<{ version: number }>(
          `SELECT version FROM ${entity} WHERE id = ?`,
          [id],
        );
        if (!row) continue;
        const unreferenced =
          entity === 'accounts'
            ? `AND NOT EXISTS (SELECT 1 FROM entries e
                 WHERE e.account_id = accounts.id OR e.destination_account_id = accounts.id)`
            : entity === 'categories'
              ? `AND NOT EXISTS (SELECT 1 FROM entries e WHERE e.category_id = categories.id)`
              : '';
        const removed =
          row.version === 0
            ? await tx.run(`DELETE FROM ${entity} WHERE id = ? ${unreferenced}`, [id])
            : { changes: 0 };
        if (removed.changes > 0) {
          await tx.run('DELETE FROM sync_outbox WHERE entity = ? AND record_id = ?', [entity, id]);
        } else {
          await tx.run(
            `UPDATE ${entity} SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
            [now, now, id],
          );
        }
      }
    }
    await tx.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [
      META_KEY,
      JSON.stringify({ state: 'declined' } satisfies ImportState),
    ]);
  });
}
