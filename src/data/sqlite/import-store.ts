import type { SyncEntity } from '@/core/sync';

import type { SqlDatabase, SqlExecutor, SqlValue } from '../db/sql-database';
import { SYNC_ENTITIES } from './sync-store';

export type ImportRecord = { entity: SyncEntity; id: string; fingerprint: string };

export type ImportState =
  | { state: 'none' }
  | { state: 'declined' }
  /** Copiado para a conta, ainda não confirmado pelo servidor: pode ser cancelado. */
  | { state: 'copied'; records: ImportRecord[] }
  /** Confirmado no servidor; `sourceCleared` indica se a cópia sem conta já foi limpa. */
  | { state: 'confirmed'; records: ImportRecord[]; sourceCleared: boolean };

const META_KEY = 'import.anonymous';

/** Outro orçamento ativo já ocupa a categoria: não se copia nem se apaga nenhum dos dois. */
async function budgetCategoryTaken(
  tx: SqlExecutor,
  categoryId: SqlValue,
  exceptId: string,
): Promise<boolean> {
  const row = await tx.first<{ id: string }>(
    'SELECT id FROM budgets WHERE category_id = ? AND deleted_at IS NULL AND id <> ?',
    [categoryId, exceptId],
  );
  return row !== null;
}

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
  budgets: [
    'id',
    'category_id',
    'amount',
    'currency',
    'period',
    'starts_on',
    'created_at',
    'updated_at',
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
  ],
  goals: ['id', 'name', 'target_amount', 'currency', 'target_on', 'created_at', 'updated_at'],
  goal_contributions: ['id', 'goal_id', 'amount', 'date', 'created_at', 'updated_at'],
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
  ],
  documents: ['id', 'title', 'category', 'expires_on', 'notes', 'created_at', 'updated_at'],
  wealth_items: [
    'id',
    'name',
    'type',
    'amount',
    'currency',
    'valued_on',
    'created_at',
    'updated_at',
  ],
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

/** Conteúdo copiado, sem `updated_at` (muda só por se tocar no registo). */
export function contentFingerprint(entity: SyncEntity, row: Record<string, SqlValue>): string {
  const pairs = COPY_COLUMNS[entity]
    .filter((column) => column !== 'updated_at')
    .map((column) => [column, row[column] ?? null]);
  return JSON.stringify(pairs);
}

function recordKey(record: ImportRecord): string {
  return `${record.entity}:${record.id}`;
}

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

/** Entidades sem regras de duplicação: qualquer linha ativa ainda conta como dados por importar. */
const PLAIN_ENTITIES_SQL = [
  'subscriptions',
  'goals',
  'goal_contributions',
  'wealth_items',
  'vehicles',
  'documents',
]
  .map((table) => `(SELECT COUNT(*) FROM ${table} WHERE deleted_at IS NULL)`)
  .join('\n          + ');

/** Há dados criados pelo utilizador no espaço sem conta (as categorias base não contam). */
export async function hasUserData(db: SqlDatabase): Promise<boolean> {
  const row = await db.first<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM accounts WHERE deleted_at IS NULL)
          + (SELECT COUNT(*) FROM entries WHERE deleted_at IS NULL)
          + (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL AND system_key IS NULL)
          + (SELECT COUNT(*) FROM budgets WHERE deleted_at IS NULL)
          + ${PLAIN_ENTITIES_SQL} AS n`,
  );
  return (row?.n ?? 0) > 0;
}

/**
 * Dados sem conta que ainda podem entrar na conta. Um orçamento cuja categoria já tem limite
 * na conta não conta: fica no dispositivo, sem apagar nenhum dos dois.
 */
export async function hasFreshUserData(source: SqlDatabase, target: SqlDatabase): Promise<boolean> {
  const structural = await source.first<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM accounts WHERE deleted_at IS NULL)
          + (SELECT COUNT(*) FROM entries WHERE deleted_at IS NULL)
          + (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL AND system_key IS NULL)
          + ${PLAIN_ENTITIES_SQL} AS n`,
  );
  if ((structural?.n ?? 0) > 0) return true;
  const sourceBudgets = await source.all<{ id: string; category_id: string }>(
    'SELECT id, category_id FROM budgets WHERE deleted_at IS NULL',
  );
  if (sourceBudgets.length === 0) return false;
  const targetBudgets = await target.all<{ id: string; category_id: string }>(
    'SELECT id, category_id FROM budgets WHERE deleted_at IS NULL',
  );
  const present = new Set(targetBudgets.map((budget) => budget.id));
  const taken = new Set(targetBudgets.map((budget) => budget.category_id));
  return sourceBudgets.some((budget) => !present.has(budget.id) && !taken.has(budget.category_id));
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
    budgets: [],
    subscriptions: [],
    goals: [],
    goal_contributions: [],
    wealth_items: [],
    vehicles: [],
    documents: [],
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
        if (
          entity === 'budgets' &&
          (await budgetCategoryTaken(tx, row.category_id ?? null, String(row.id)))
        ) {
          continue;
        }
        const result = await tx.run(
          `INSERT OR IGNORE INTO ${entity} (${columns.join(', ')})
           VALUES (${columns.map(() => '?').join(', ')})`,
          columns.map((column) => row[column] ?? null),
        );
        if (result.changes > 0) {
          copied.push({ entity, id: String(row.id), fingerprint: contentFingerprint(entity, row) });
        }
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

function byEntity(records: ImportRecord[], entity: SyncEntity): ImportRecord[] {
  return records.filter((record) => record.entity === entity);
}

async function readRow(
  db: SqlExecutor,
  entity: SyncEntity,
  id: string,
): Promise<Record<string, SqlValue> | null> {
  return db.first<Record<string, SqlValue>>(
    `SELECT ${COPY_COLUMNS[entity].join(', ')} FROM ${entity} WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
}

async function writeCopiedRow(
  tx: SqlExecutor,
  entity: SyncEntity,
  row: Record<string, SqlValue>,
): Promise<boolean> {
  const columns = COPY_COLUMNS[entity];
  const inserted = await tx.run(
    `INSERT OR IGNORE INTO ${entity} (${columns.join(', ')})
     VALUES (${columns.map(() => '?').join(', ')})`,
    columns.map((column) => row[column] ?? null),
  );
  if (inserted.changes > 0) return true;
  const existing = await tx.first<{ id: string }>(`SELECT id FROM ${entity} WHERE id = ?`, [
    row.id ?? null,
  ]);
  if (!existing) return false;
  const assignments = columns.filter((column) => column !== 'id' && column !== 'created_at');
  await tx.run(
    `UPDATE ${entity} SET ${assignments.map((column) => `${column} = ?`).join(', ')} WHERE id = ?`,
    [...assignments.map((column) => row[column] ?? null), row.id ?? null],
  );
  return true;
}

/**
 * Traz para a conta o que mudou ou apareceu na origem desde a cópia.
 * Não substitui uma linha da conta que já divergiu do instantâneo importado.
 */
export async function absorbSourceChanges(
  source: SqlDatabase,
  target: SqlDatabase,
  records: ImportRecord[],
): Promise<ImportRecord[]> {
  const next = records.map((record) => ({ ...record }));
  const known = new Map(next.map((record) => [recordKey(record), record]));

  await target.transaction(async (tx) => {
    for (const entity of SYNC_ENTITIES) {
      const rows = await source.all<Record<string, SqlValue>>(
        `SELECT ${COPY_COLUMNS[entity].join(', ')} FROM ${entity} WHERE deleted_at IS NULL`,
      );
      for (const row of rows) {
        const id = String(row.id);
        const sourceFingerprint = contentFingerprint(entity, row);
        const current = known.get(`${entity}:${id}`);
        if (!current) {
          if (entity === 'categories' && row.system_key != null) continue;
          if (
            entity === 'budgets' &&
            (await budgetCategoryTaken(tx, row.category_id ?? null, id))
          ) {
            continue;
          }
          if (!(await writeCopiedRow(tx, entity, row))) continue;
          const created: ImportRecord = { entity, id, fingerprint: sourceFingerprint };
          next.push(created);
          known.set(`${entity}:${id}`, created);
          continue;
        }
        if (current.fingerprint === sourceFingerprint) continue;
        const targetRow = await readRow(tx, entity, id);
        const targetFingerprint = targetRow ? contentFingerprint(entity, targetRow) : null;
        if (targetFingerprint === sourceFingerprint) {
          current.fingerprint = sourceFingerprint;
          continue;
        }
        if (
          targetFingerprint !== null &&
          current.fingerprint &&
          targetFingerprint !== current.fingerprint
        ) {
          continue;
        }
        if (entity === 'budgets' && (await budgetCategoryTaken(tx, row.category_id ?? null, id))) {
          continue;
        }
        if (!(await writeCopiedRow(tx, entity, row))) continue;
        current.fingerprint = sourceFingerprint;
      }
    }
    await tx.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [
      META_KEY,
      JSON.stringify({ state: 'copied', records: next } satisfies ImportState),
    ]);
  });
  return next;
}

/**
 * Remove da origem só as linhas cujo conteúdo ainda é o que foi confirmado.
 * Categorias de sistema ficam no uso sem conta. Devolve quantas linhas mudaram
 * outra vez e por isso não foram apagadas.
 */
export async function clearImportedFromSource(
  source: SqlDatabase,
  records: ImportRecord[],
): Promise<{ pending: number }> {
  let pending = 0;
  await source.transaction(async (tx) => {
    for (const entity of [...SYNC_ENTITIES].reverse()) {
      const guard =
        entity === 'accounts'
          ? `AND NOT EXISTS (SELECT 1 FROM entries e
               WHERE e.account_id = accounts.id OR e.destination_account_id = accounts.id)`
          : entity === 'categories'
            ? `AND system_key IS NULL
               AND NOT EXISTS (SELECT 1 FROM entries e WHERE e.category_id = categories.id)
               AND NOT EXISTS (SELECT 1 FROM budgets b
                 WHERE b.category_id = categories.id AND b.deleted_at IS NULL)`
            : '';
      for (const record of byEntity(records, entity)) {
        const row = await readRow(tx, entity, record.id);
        if (!row) continue;
        if (!record.fingerprint || contentFingerprint(entity, row) !== record.fingerprint) {
          pending += 1;
          continue;
        }
        const removed = await tx.run(`DELETE FROM ${entity} WHERE id = ? ${guard}`, [record.id]);
        const systemCategory =
          entity === 'categories' && row.system_key !== null && row.system_key !== undefined;
        if (removed.changes === 0 && !systemCategory) pending += 1;
      }
    }
  });
  return { pending };
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
      for (const { id } of byEntity(records, entity)) {
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
              ? `AND NOT EXISTS (SELECT 1 FROM entries e WHERE e.category_id = categories.id)
                 AND NOT EXISTS (SELECT 1 FROM budgets b
                   WHERE b.category_id = categories.id AND b.deleted_at IS NULL)`
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
