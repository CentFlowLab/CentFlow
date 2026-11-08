import type { SqlDatabase } from './sql-database';

export type Migration = {
  version: number;
  description: string;
  sql: string;
};

/**
 * Esquema local. Regras:
 * - nunca alterar uma migração já publicada; acrescentar uma nova versão;
 * - valores monetários em INTEGER (unidades mínimas);
 * - datas de movimentos em TEXT "YYYY-MM-DD"; instantes em TEXT ISO 8601 UTC;
 * - `deleted_at` (tombstone) e `synced_at` preparam a sincronização com o Supabase.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    description: 'accounts, categories, entries, meta',
    sql: `
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
        type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'savings', 'card', 'investment', 'custom')),
        currency TEXT NOT NULL CHECK (length(currency) = 3 AND currency = upper(currency)),
        initial_balance INTEGER NOT NULL DEFAULT 0 CHECK (typeof(initial_balance) = 'integer'),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT,
        deleted_at TEXT,
        synced_at TEXT
      );

      CREATE TABLE categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        synced_at TEXT
      );

      CREATE TABLE entries (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
        amount INTEGER NOT NULL CHECK (typeof(amount) = 'integer' AND amount > 0),
        description TEXT NOT NULL DEFAULT '',
        search_text TEXT NOT NULL DEFAULT '',
        category_id TEXT REFERENCES categories (id) ON DELETE RESTRICT,
        account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE RESTRICT,
        destination_account_id TEXT REFERENCES accounts (id) ON DELETE RESTRICT,
        date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        synced_at TEXT,
        CHECK (
          (type = 'transfer'
            AND category_id IS NULL
            AND destination_account_id IS NOT NULL
            AND destination_account_id <> account_id)
          OR
          (type IN ('income', 'expense')
            AND category_id IS NOT NULL
            AND destination_account_id IS NULL)
        )
      );

      CREATE INDEX idx_entries_date ON entries (date DESC, created_at DESC) WHERE deleted_at IS NULL;
      CREATE INDEX idx_entries_account_date ON entries (account_id, date) WHERE deleted_at IS NULL;
      CREATE INDEX idx_entries_destination ON entries (destination_account_id) WHERE deleted_at IS NULL;
      CREATE INDEX idx_entries_category_date ON entries (category_id, date) WHERE deleted_at IS NULL;
      CREATE INDEX idx_entries_type_date ON entries (type, date) WHERE deleted_at IS NULL;
      CREATE INDEX idx_accounts_active ON accounts (archived_at) WHERE deleted_at IS NULL;
      CREATE INDEX idx_categories_type ON categories (type) WHERE deleted_at IS NULL;

      CREATE TABLE meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `,
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

export class SchemaTooNewError extends Error {
  constructor(
    readonly found: number,
    readonly supported: number,
  ) {
    super(`Database schema v${found} is newer than supported v${supported}`);
    this.name = 'SchemaTooNewError';
  }
}

export async function getSchemaVersion(db: SqlDatabase): Promise<number> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  if (!row || typeof row.user_version !== 'number') {
    throw new Error('Could not read the database schema version');
  }
  return row.user_version;
}

/**
 * Aplica as migrações em falta. Cada versão e o respetivo `user_version` são gravados
 * na mesma transação: uma falha deixa a base de dados na versão anterior, intacta.
 */
export async function migrate(
  db: SqlDatabase,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<{ from: number; to: number }> {
  const latest = migrations[migrations.length - 1]?.version ?? 0;
  const from = await getSchemaVersion(db);
  if (from > latest) throw new SchemaTooNewError(from, latest);

  for (const migration of migrations) {
    if (migration.version <= from) continue;
    if (!Number.isInteger(migration.version) || migration.version < 1) {
      throw new Error(`Invalid migration version ${migration.version}`);
    }
    await db.transaction(async (tx) => {
      await tx.exec(migration.sql);
      await tx.exec(`PRAGMA user_version = ${migration.version}`);
    });
  }
  return { from, to: Math.max(from, latest) };
}
