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
  {
    version: 2,
    description: 'sync: versions, outbox triggers, inbox, conflicts, fixed default category ids',
    sql: migrationV2(),
  },
  {
    version: 3,
    description: 'local budgets (one active limit per category; not enrolled in sync)',
    sql: `
      -- Limites locais. Não entram na fila de sincronização: o CHECK publicado das tabelas
      -- sync_* só aceita accounts, categories e entries, e uma migração publicada não se altera.
      CREATE TABLE budgets (
        id TEXT PRIMARY KEY NOT NULL,
        category_id TEXT NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
        amount INTEGER NOT NULL CHECK (typeof(amount) = 'integer' AND amount > 0),
        currency TEXT NOT NULL CHECK (length(currency) = 3 AND currency = upper(currency)),
        period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
        starts_on TEXT NOT NULL CHECK (starts_on GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        synced_at TEXT
      );
      CREATE UNIQUE INDEX idx_budgets_category ON budgets (category_id) WHERE deleted_at IS NULL;
    `,
  },
  {
    version: 4,
    description: 'enroll budgets in the sync outbox, inbox and conflicts',
    sql: migrationV4(),
  },
  {
    version: 5,
    description: 'subscriptions: recurring user expenses, enrolled in sync',
    sql: migrationV5(),
  },
  {
    version: 6,
    description: 'savings goals and contributions, enrolled in sync',
    sql: migrationV6(),
  },
  {
    version: 7,
    description: 'wealth items (assets and liabilities), enrolled in sync',
    sql: migrationV7(),
  },
];

/**
 * v2 — sincronização (Fase 2). Gerada a partir de constantes locais a esta função: nunca alterar
 * depois de publicada.
 */
function migrationV2(): string {
  const synced = {
    accounts: [
      'name',
      'type',
      'currency',
      'initial_balance',
      'archived_at',
      'created_at',
      'deleted_at',
    ],
    categories: ['name', 'type', 'icon', 'color', 'system_key', 'created_at', 'deleted_at'],
    entries: [
      'type',
      'amount',
      'description',
      'notes',
      'category_id',
      'account_id',
      'destination_account_id',
      'date',
      'created_at',
      'deleted_at',
    ],
  } as const;

  // UUID v4 aleatório gerado pelo SQLite (randomblob usa o gerador do sistema).
  const uuid = `lower(
    hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-'
    || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-'
    || hex(randomblob(6)))`;
  const tracking = `(SELECT tracking = 1 AND applying_remote = 0 FROM sync_state WHERE id = 1)`;

  const triggers = Object.entries(synced).map(([table, columns]) => {
    const json = (row: 'NEW' | 'OLD') =>
      `json_object(${columns.map((column) => `'${column}', ${row}.${column}`).join(', ')})`;
    const nextBase = `COALESCE(
      (SELECT base_version + 1 FROM sync_outbox
        WHERE entity = '${table}' AND record_id = NEW.id ORDER BY seq DESC LIMIT 1),
      OLD.version)`;
    return `
      CREATE TRIGGER sync_${table}_insert AFTER INSERT ON ${table}
      WHEN ${tracking}
      BEGIN
        INSERT INTO sync_outbox (op_id, tx_id, entity, record_id, base_version, base, data, created_at)
        VALUES (${uuid}, (SELECT current_tx FROM sync_state WHERE id = 1), '${table}', NEW.id,
          COALESCE((SELECT base_version + 1 FROM sync_outbox
                     WHERE entity = '${table}' AND record_id = NEW.id ORDER BY seq DESC LIMIT 1),
                   NEW.version),
          NULL, ${json('NEW')}, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
      END;

      CREATE TRIGGER sync_${table}_update AFTER UPDATE ON ${table}
      WHEN ${tracking}
      BEGIN
        INSERT INTO sync_outbox (op_id, tx_id, entity, record_id, base_version, base, data, created_at)
        VALUES (${uuid}, (SELECT current_tx FROM sync_state WHERE id = 1), '${table}', NEW.id,
          ${nextBase}, ${json('OLD')}, ${json('NEW')}, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
      END;`;
  });

  const defaults: [number, string, string, string, string, string][] = [
    [1, 'housing', 'cf000000-0000-4000-8000-000000000001', 'expense', 'home-outline', 'indigo'],
    [2, 'groceries', 'cf000000-0000-4000-8000-000000000002', 'expense', 'cart-outline', 'green'],
    [
      3,
      'dining',
      'cf000000-0000-4000-8000-000000000003',
      'expense',
      'restaurant-outline',
      'orange',
    ],
    [4, 'transport', 'cf000000-0000-4000-8000-000000000004', 'expense', 'bus-outline', 'blue'],
    [5, 'health', 'cf000000-0000-4000-8000-000000000005', 'expense', 'medkit-outline', 'red'],
    [6, 'leisure', 'cf000000-0000-4000-8000-000000000006', 'expense', 'film-outline', 'purple'],
    [
      7,
      'shopping',
      'cf000000-0000-4000-8000-000000000007',
      'expense',
      'bag-handle-outline',
      'pink',
    ],
    [8, 'bills', 'cf000000-0000-4000-8000-000000000008', 'expense', 'flash-outline', 'amber'],
    [9, 'education', 'cf000000-0000-4000-8000-000000000009', 'expense', 'school-outline', 'teal'],
    [
      10,
      'otherExpense',
      'cf000000-0000-4000-8000-00000000000a',
      'expense',
      'ellipsis-horizontal',
      'slate',
    ],
    [11, 'salary', 'cf000000-0000-4000-8000-00000000000b', 'income', 'briefcase-outline', 'green'],
    [12, 'freelance', 'cf000000-0000-4000-8000-00000000000c', 'income', 'laptop-outline', 'blue'],
    [
      13,
      'investmentIncome',
      'cf000000-0000-4000-8000-00000000000d',
      'income',
      'trending-up-outline',
      'teal',
    ],
    [14, 'gifts', 'cf000000-0000-4000-8000-00000000000e', 'income', 'gift-outline', 'pink'],
    [
      15,
      'otherIncome',
      'cf000000-0000-4000-8000-00000000000f',
      'income',
      'ellipsis-horizontal',
      'slate',
    ],
  ];
  const defaultsTable = defaults
    .map(
      (row) =>
        `(${row.map((value) => (typeof value === 'number' ? value : `'${value}'`)).join(', ')})`,
    )
    .join(',\n        ');

  return `
    ALTER TABLE accounts ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE accounts ADD COLUMN server_seq INTEGER;
    ALTER TABLE categories ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE categories ADD COLUMN server_seq INTEGER;
    ALTER TABLE categories ADD COLUMN system_key TEXT;
    ALTER TABLE entries ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE entries ADD COLUMN server_seq INTEGER;

    -- Categorias base da v1 (criadas com UUID aleatório): passam para os identificadores fixos,
    -- reconhecidas pela posição de criação e pelo tipo, ícone e cor originais.
    CREATE TEMP TABLE category_remap AS
      SELECT c.id AS old_id, d.new_id, d.system_key
        FROM (SELECT id, type, icon, color, ROW_NUMBER() OVER (ORDER BY rowid) AS n
                FROM categories) c
        JOIN (SELECT column1 AS n, column2 AS system_key, column3 AS new_id, column4 AS type,
                     column5 AS icon, column6 AS color
                FROM (VALUES
        ${defaultsTable})) d
          ON c.n = d.n AND c.type = d.type AND c.icon = d.icon AND c.color = d.color
       WHERE EXISTS (SELECT 1 FROM meta WHERE key = 'seed.defaultCategories');

    INSERT INTO categories (id, name, type, icon, color, system_key, created_at, updated_at,
                            deleted_at, synced_at)
      SELECT r.new_id, c.name, c.type, c.icon, c.color, r.system_key, c.created_at, c.updated_at,
             c.deleted_at, c.synced_at
        FROM category_remap r JOIN categories c ON c.id = r.old_id;
    UPDATE entries SET category_id = (SELECT new_id FROM category_remap WHERE old_id = category_id)
      WHERE category_id IN (SELECT old_id FROM category_remap);
    DELETE FROM categories WHERE id IN (SELECT old_id FROM category_remap);
    DROP TABLE category_remap;

    CREATE TABLE sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      tracking INTEGER NOT NULL DEFAULT 0 CHECK (tracking IN (0, 1)),
      applying_remote INTEGER NOT NULL DEFAULT 0 CHECK (applying_remote IN (0, 1)),
      current_tx TEXT,
      owner_user_id TEXT,
      pull_cursor INTEGER NOT NULL DEFAULT 0,
      last_synced_at TEXT
    );
    INSERT INTO sync_state (id) VALUES (1);

    -- Alterações locais por enviar, pela ordem em que foram feitas.
    CREATE TABLE sync_outbox (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      op_id TEXT NOT NULL UNIQUE,
      tx_id TEXT,
      entity TEXT NOT NULL CHECK (entity IN ('accounts', 'categories', 'entries')),
      record_id TEXT NOT NULL,
      base_version INTEGER NOT NULL CHECK (base_version >= 0),
      base TEXT,
      data TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX idx_sync_outbox_record ON sync_outbox (entity, record_id, seq);

    -- Alterações recebidas, guardadas até a leitura completa terminar (retoma após interrupção).
    CREATE TABLE sync_inbox (
      server_seq INTEGER PRIMARY KEY,
      entity TEXT NOT NULL CHECK (entity IN ('accounts', 'categories', 'entries')),
      data TEXT NOT NULL
    );

    -- Versões em conflito, preservadas até o utilizador decidir.
    CREATE TABLE sync_conflicts (
      id TEXT PRIMARY KEY NOT NULL,
      entity TEXT NOT NULL CHECK (entity IN ('accounts', 'categories', 'entries')),
      record_id TEXT NOT NULL,
      reason TEXT NOT NULL CHECK (reason IN ('version', 'missing', 'rejected')),
      detail TEXT,
      base_data TEXT,
      local_data TEXT,
      server_data TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolution TEXT CHECK (resolution IS NULL OR resolution IN ('keepLocal', 'keepServer'))
    );
    CREATE INDEX idx_sync_conflicts_open ON sync_conflicts (created_at) WHERE resolved_at IS NULL;

    ${triggers.join('\n')}
  `;
}

/** v4 — orçamentos passam a usar a mesma fila das outras entidades. */
function migrationV4(): string {
  const uuid = `lower(
    hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-'
    || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-'
    || hex(randomblob(6)))`;
  const tracking = `(SELECT tracking = 1 AND applying_remote = 0 FROM sync_state WHERE id = 1)`;
  const columns = [
    'category_id',
    'amount',
    'currency',
    'period',
    'starts_on',
    'created_at',
    'deleted_at',
  ];
  const json = (row: 'NEW' | 'OLD', fields: readonly string[]) =>
    `json_object(${fields.map((column) => `'${column}', ${row}.${column}`).join(', ')})`;
  const entities = `('accounts', 'categories', 'budgets', 'entries')`;
  const synced = {
    accounts: [
      'name',
      'type',
      'currency',
      'initial_balance',
      'archived_at',
      'created_at',
      'deleted_at',
    ],
    categories: ['name', 'type', 'icon', 'color', 'system_key', 'created_at', 'deleted_at'],
    budgets: columns,
    entries: [
      'type',
      'amount',
      'description',
      'notes',
      'category_id',
      'account_id',
      'destination_account_id',
      'date',
      'created_at',
      'deleted_at',
    ],
  } as const;
  const triggers = Object.entries(synced)
    .map(([table, fields]) => {
      const nextBase = `COALESCE(
        (SELECT base_version + 1 FROM sync_outbox
          WHERE entity = '${table}' AND record_id = NEW.id ORDER BY seq DESC LIMIT 1),
        OLD.version)`;
      const insertBase = `COALESCE(
        (SELECT base_version + 1 FROM sync_outbox
          WHERE entity = '${table}' AND record_id = NEW.id ORDER BY seq DESC LIMIT 1),
        NEW.version)`;
      return `
        DROP TRIGGER IF EXISTS sync_${table}_insert;
        DROP TRIGGER IF EXISTS sync_${table}_update;
        CREATE TRIGGER sync_${table}_insert AFTER INSERT ON ${table}
        WHEN ${tracking}
        BEGIN
          INSERT INTO sync_outbox (op_id, tx_id, entity, record_id, base_version, base, data, created_at)
          VALUES (${uuid}, (SELECT current_tx FROM sync_state WHERE id = 1), '${table}', NEW.id,
            ${insertBase}, NULL, ${json('NEW', fields)}, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
        END;
        CREATE TRIGGER sync_${table}_update AFTER UPDATE ON ${table}
        WHEN ${tracking}
        BEGIN
          INSERT INTO sync_outbox (op_id, tx_id, entity, record_id, base_version, base, data, created_at)
          VALUES (${uuid}, (SELECT current_tx FROM sync_state WHERE id = 1), '${table}', NEW.id,
            ${nextBase}, ${json('OLD', fields)}, ${json('NEW', fields)},
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
        END;`;
    })
    .join('\n');

  return `
    ALTER TABLE budgets ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE budgets ADD COLUMN server_seq INTEGER;

    -- Os triggers referenciam sync_outbox. Têm de sair antes de a tabela ser recriada,
    -- senão o RENAME tenta recompilá-los contra uma tabela que já não existe.
    DROP TRIGGER IF EXISTS sync_accounts_insert;
    DROP TRIGGER IF EXISTS sync_accounts_update;
    DROP TRIGGER IF EXISTS sync_categories_insert;
    DROP TRIGGER IF EXISTS sync_categories_update;
    DROP TRIGGER IF EXISTS sync_entries_insert;
    DROP TRIGGER IF EXISTS sync_entries_update;

    CREATE TABLE sync_outbox_v4 (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      op_id TEXT NOT NULL UNIQUE,
      tx_id TEXT,
      entity TEXT NOT NULL CHECK (entity IN ${entities}),
      record_id TEXT NOT NULL,
      base_version INTEGER NOT NULL CHECK (base_version >= 0),
      base TEXT,
      data TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL
    );
    INSERT INTO sync_outbox_v4
      (seq, op_id, tx_id, entity, record_id, base_version, base, data, attempts, last_error, created_at)
      SELECT seq, op_id, tx_id, entity, record_id, base_version, base, data, attempts, last_error, created_at
        FROM sync_outbox;
    DROP TABLE sync_outbox;
    ALTER TABLE sync_outbox_v4 RENAME TO sync_outbox;
    CREATE INDEX idx_sync_outbox_record ON sync_outbox (entity, record_id, seq);

    CREATE TABLE sync_inbox_v4 (
      server_seq INTEGER PRIMARY KEY,
      entity TEXT NOT NULL CHECK (entity IN ${entities}),
      data TEXT NOT NULL
    );
    INSERT INTO sync_inbox_v4 (server_seq, entity, data)
      SELECT server_seq, entity, data FROM sync_inbox;
    DROP TABLE sync_inbox;
    ALTER TABLE sync_inbox_v4 RENAME TO sync_inbox;

    CREATE TABLE sync_conflicts_v4 (
      id TEXT PRIMARY KEY NOT NULL,
      entity TEXT NOT NULL CHECK (entity IN ${entities}),
      record_id TEXT NOT NULL,
      reason TEXT NOT NULL CHECK (reason IN ('version', 'missing', 'rejected')),
      detail TEXT,
      base_data TEXT,
      local_data TEXT,
      server_data TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolution TEXT CHECK (resolution IS NULL OR resolution IN ('keepLocal', 'keepServer'))
    );
    INSERT INTO sync_conflicts_v4
      (id, entity, record_id, reason, detail, base_data, local_data, server_data, created_at,
       resolved_at, resolution)
      SELECT id, entity, record_id, reason, detail, base_data, local_data, server_data, created_at,
             resolved_at, resolution
        FROM sync_conflicts;
    DROP TABLE sync_conflicts;
    ALTER TABLE sync_conflicts_v4 RENAME TO sync_conflicts;
    CREATE INDEX idx_sync_conflicts_open ON sync_conflicts (created_at) WHERE resolved_at IS NULL;

    ${triggers}

    -- Limites já gravados numa conta com sincronização ligada entram na fila uma vez.
    UPDATE budgets SET updated_at = updated_at
     WHERE version = 0 AND ${tracking};
  `;
}

/** v5 — despesas recorrentes do utilizador, na mesma fila das outras entidades. */
function migrationV5(): string {
  const uuid = `lower(
    hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-'
    || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-'
    || hex(randomblob(6)))`;
  const tracking = `(SELECT tracking = 1 AND applying_remote = 0 FROM sync_state WHERE id = 1)`;
  const entities = `('accounts', 'categories', 'budgets', 'subscriptions', 'entries')`;
  const json = (row: 'NEW' | 'OLD', fields: readonly string[]) =>
    `json_object(${fields.map((column) => `'${column}', ${row}.${column}`).join(', ')})`;
  const synced = {
    accounts: [
      'name',
      'type',
      'currency',
      'initial_balance',
      'archived_at',
      'created_at',
      'deleted_at',
    ],
    categories: ['name', 'type', 'icon', 'color', 'system_key', 'created_at', 'deleted_at'],
    budgets: [
      'category_id',
      'amount',
      'currency',
      'period',
      'starts_on',
      'created_at',
      'deleted_at',
    ],
    subscriptions: [
      'name',
      'amount',
      'currency',
      'period',
      'status',
      'starts_on',
      'next_on',
      'category_id',
      'created_at',
      'deleted_at',
    ],
    entries: [
      'type',
      'amount',
      'description',
      'notes',
      'category_id',
      'account_id',
      'destination_account_id',
      'date',
      'created_at',
      'deleted_at',
    ],
  } as const;
  const triggers = Object.entries(synced)
    .map(([table, fields]) => {
      const nextBase = `COALESCE(
        (SELECT base_version + 1 FROM sync_outbox
          WHERE entity = '${table}' AND record_id = NEW.id ORDER BY seq DESC LIMIT 1),
        OLD.version)`;
      const insertBase = `COALESCE(
        (SELECT base_version + 1 FROM sync_outbox
          WHERE entity = '${table}' AND record_id = NEW.id ORDER BY seq DESC LIMIT 1),
        NEW.version)`;
      return `
        DROP TRIGGER IF EXISTS sync_${table}_insert;
        DROP TRIGGER IF EXISTS sync_${table}_update;
        CREATE TRIGGER sync_${table}_insert AFTER INSERT ON ${table}
        WHEN ${tracking}
        BEGIN
          INSERT INTO sync_outbox (op_id, tx_id, entity, record_id, base_version, base, data, created_at)
          VALUES (${uuid}, (SELECT current_tx FROM sync_state WHERE id = 1), '${table}', NEW.id,
            ${insertBase}, NULL, ${json('NEW', fields)}, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
        END;
        CREATE TRIGGER sync_${table}_update AFTER UPDATE ON ${table}
        WHEN ${tracking}
        BEGIN
          INSERT INTO sync_outbox (op_id, tx_id, entity, record_id, base_version, base, data, created_at)
          VALUES (${uuid}, (SELECT current_tx FROM sync_state WHERE id = 1), '${table}', NEW.id,
            ${nextBase}, ${json('OLD', fields)}, ${json('NEW', fields)},
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
        END;`;
    })
    .join('\n');

  return `
    CREATE TABLE subscriptions (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
      amount INTEGER NOT NULL CHECK (typeof(amount) = 'integer' AND amount > 0),
      currency TEXT NOT NULL CHECK (length(currency) = 3 AND currency = upper(currency)),
      period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
      status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'cancelled')),
      starts_on TEXT NOT NULL CHECK (starts_on GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
      next_on TEXT NOT NULL CHECK (next_on GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
      category_id TEXT REFERENCES categories (id) ON DELETE RESTRICT,
      version INTEGER NOT NULL DEFAULT 0,
      server_seq INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      synced_at TEXT,
      CHECK (next_on >= starts_on)
    );

    DROP TRIGGER IF EXISTS sync_accounts_insert;
    DROP TRIGGER IF EXISTS sync_accounts_update;
    DROP TRIGGER IF EXISTS sync_categories_insert;
    DROP TRIGGER IF EXISTS sync_categories_update;
    DROP TRIGGER IF EXISTS sync_budgets_insert;
    DROP TRIGGER IF EXISTS sync_budgets_update;
    DROP TRIGGER IF EXISTS sync_entries_insert;
    DROP TRIGGER IF EXISTS sync_entries_update;

    CREATE TABLE sync_outbox_v5 (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      op_id TEXT NOT NULL UNIQUE,
      tx_id TEXT,
      entity TEXT NOT NULL CHECK (entity IN ${entities}),
      record_id TEXT NOT NULL,
      base_version INTEGER NOT NULL CHECK (base_version >= 0),
      base TEXT,
      data TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL
    );
    INSERT INTO sync_outbox_v5
      (seq, op_id, tx_id, entity, record_id, base_version, base, data, attempts, last_error, created_at)
      SELECT seq, op_id, tx_id, entity, record_id, base_version, base, data, attempts, last_error, created_at
        FROM sync_outbox;
    DROP TABLE sync_outbox;
    ALTER TABLE sync_outbox_v5 RENAME TO sync_outbox;
    CREATE INDEX idx_sync_outbox_record ON sync_outbox (entity, record_id, seq);

    CREATE TABLE sync_inbox_v5 (
      server_seq INTEGER PRIMARY KEY,
      entity TEXT NOT NULL CHECK (entity IN ${entities}),
      data TEXT NOT NULL
    );
    INSERT INTO sync_inbox_v5 (server_seq, entity, data)
      SELECT server_seq, entity, data FROM sync_inbox;
    DROP TABLE sync_inbox;
    ALTER TABLE sync_inbox_v5 RENAME TO sync_inbox;

    CREATE TABLE sync_conflicts_v5 (
      id TEXT PRIMARY KEY NOT NULL,
      entity TEXT NOT NULL CHECK (entity IN ${entities}),
      record_id TEXT NOT NULL,
      reason TEXT NOT NULL CHECK (reason IN ('version', 'missing', 'rejected')),
      detail TEXT,
      base_data TEXT,
      local_data TEXT,
      server_data TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolution TEXT CHECK (resolution IS NULL OR resolution IN ('keepLocal', 'keepServer'))
    );
    INSERT INTO sync_conflicts_v5
      (id, entity, record_id, reason, detail, base_data, local_data, server_data, created_at,
       resolved_at, resolution)
      SELECT id, entity, record_id, reason, detail, base_data, local_data, server_data, created_at,
             resolved_at, resolution
        FROM sync_conflicts;
    DROP TABLE sync_conflicts;
    ALTER TABLE sync_conflicts_v5 RENAME TO sync_conflicts;
    CREATE INDEX idx_sync_conflicts_open ON sync_conflicts (created_at) WHERE resolved_at IS NULL;

    ${triggers}
  `;
}

/** v6 — objetivos de poupança e contribuições, na mesma fila. O progresso não é uma coluna. */
function migrationV6(): string {
  const uuid = `lower(
    hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-'
    || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-'
    || hex(randomblob(6)))`;
  const tracking = `(SELECT tracking = 1 AND applying_remote = 0 FROM sync_state WHERE id = 1)`;
  const entities = `('accounts', 'categories', 'budgets', 'subscriptions', 'goals', 'goal_contributions', 'entries')`;
  const json = (row: 'NEW' | 'OLD', fields: readonly string[]) =>
    `json_object(${fields.map((column) => `'${column}', ${row}.${column}`).join(', ')})`;
  const synced = {
    accounts: [
      'name',
      'type',
      'currency',
      'initial_balance',
      'archived_at',
      'created_at',
      'deleted_at',
    ],
    categories: ['name', 'type', 'icon', 'color', 'system_key', 'created_at', 'deleted_at'],
    budgets: [
      'category_id',
      'amount',
      'currency',
      'period',
      'starts_on',
      'created_at',
      'deleted_at',
    ],
    subscriptions: [
      'name',
      'amount',
      'currency',
      'period',
      'status',
      'starts_on',
      'next_on',
      'category_id',
      'created_at',
      'deleted_at',
    ],
    goals: ['name', 'target_amount', 'currency', 'target_on', 'created_at', 'deleted_at'],
    goal_contributions: ['goal_id', 'amount', 'date', 'created_at', 'deleted_at'],
    entries: [
      'type',
      'amount',
      'description',
      'notes',
      'category_id',
      'account_id',
      'destination_account_id',
      'date',
      'created_at',
      'deleted_at',
    ],
  } as const;
  const triggers = Object.entries(synced)
    .map(([table, fields]) => {
      const nextBase = `COALESCE(
        (SELECT base_version + 1 FROM sync_outbox
          WHERE entity = '${table}' AND record_id = NEW.id ORDER BY seq DESC LIMIT 1),
        OLD.version)`;
      const insertBase = `COALESCE(
        (SELECT base_version + 1 FROM sync_outbox
          WHERE entity = '${table}' AND record_id = NEW.id ORDER BY seq DESC LIMIT 1),
        NEW.version)`;
      return `
        DROP TRIGGER IF EXISTS sync_${table}_insert;
        DROP TRIGGER IF EXISTS sync_${table}_update;
        CREATE TRIGGER sync_${table}_insert AFTER INSERT ON ${table}
        WHEN ${tracking}
        BEGIN
          INSERT INTO sync_outbox (op_id, tx_id, entity, record_id, base_version, base, data, created_at)
          VALUES (${uuid}, (SELECT current_tx FROM sync_state WHERE id = 1), '${table}', NEW.id,
            ${insertBase}, NULL, ${json('NEW', fields)}, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
        END;
        CREATE TRIGGER sync_${table}_update AFTER UPDATE ON ${table}
        WHEN ${tracking}
        BEGIN
          INSERT INTO sync_outbox (op_id, tx_id, entity, record_id, base_version, base, data, created_at)
          VALUES (${uuid}, (SELECT current_tx FROM sync_state WHERE id = 1), '${table}', NEW.id,
            ${nextBase}, ${json('OLD', fields)}, ${json('NEW', fields)},
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
        END;`;
    })
    .join('\n');

  return `
    CREATE TABLE goals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
      target_amount INTEGER NOT NULL CHECK (typeof(target_amount) = 'integer' AND target_amount > 0),
      currency TEXT NOT NULL CHECK (length(currency) = 3 AND currency = upper(currency)),
      target_on TEXT CHECK (
        target_on IS NULL OR target_on GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'
      ),
      version INTEGER NOT NULL DEFAULT 0,
      server_seq INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      synced_at TEXT
    );

    CREATE TABLE goal_contributions (
      id TEXT PRIMARY KEY NOT NULL,
      goal_id TEXT NOT NULL REFERENCES goals (id) ON DELETE RESTRICT,
      amount INTEGER NOT NULL CHECK (typeof(amount) = 'integer' AND amount > 0),
      date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
      version INTEGER NOT NULL DEFAULT 0,
      server_seq INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      synced_at TEXT
    );

    DROP TRIGGER IF EXISTS sync_accounts_insert;
    DROP TRIGGER IF EXISTS sync_accounts_update;
    DROP TRIGGER IF EXISTS sync_categories_insert;
    DROP TRIGGER IF EXISTS sync_categories_update;
    DROP TRIGGER IF EXISTS sync_budgets_insert;
    DROP TRIGGER IF EXISTS sync_budgets_update;
    DROP TRIGGER IF EXISTS sync_subscriptions_insert;
    DROP TRIGGER IF EXISTS sync_subscriptions_update;
    DROP TRIGGER IF EXISTS sync_entries_insert;
    DROP TRIGGER IF EXISTS sync_entries_update;

    CREATE TABLE sync_outbox_v6 (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      op_id TEXT NOT NULL UNIQUE,
      tx_id TEXT,
      entity TEXT NOT NULL CHECK (entity IN ${entities}),
      record_id TEXT NOT NULL,
      base_version INTEGER NOT NULL CHECK (base_version >= 0),
      base TEXT,
      data TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL
    );
    INSERT INTO sync_outbox_v6
      (seq, op_id, tx_id, entity, record_id, base_version, base, data, attempts, last_error, created_at)
      SELECT seq, op_id, tx_id, entity, record_id, base_version, base, data, attempts, last_error, created_at
        FROM sync_outbox;
    DROP TABLE sync_outbox;
    ALTER TABLE sync_outbox_v6 RENAME TO sync_outbox;
    CREATE INDEX idx_sync_outbox_record ON sync_outbox (entity, record_id, seq);

    CREATE TABLE sync_inbox_v6 (
      server_seq INTEGER PRIMARY KEY,
      entity TEXT NOT NULL CHECK (entity IN ${entities}),
      data TEXT NOT NULL
    );
    INSERT INTO sync_inbox_v6 (server_seq, entity, data)
      SELECT server_seq, entity, data FROM sync_inbox;
    DROP TABLE sync_inbox;
    ALTER TABLE sync_inbox_v6 RENAME TO sync_inbox;

    CREATE TABLE sync_conflicts_v6 (
      id TEXT PRIMARY KEY NOT NULL,
      entity TEXT NOT NULL CHECK (entity IN ${entities}),
      record_id TEXT NOT NULL,
      reason TEXT NOT NULL CHECK (reason IN ('version', 'missing', 'rejected')),
      detail TEXT,
      base_data TEXT,
      local_data TEXT,
      server_data TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolution TEXT CHECK (resolution IS NULL OR resolution IN ('keepLocal', 'keepServer'))
    );
    INSERT INTO sync_conflicts_v6
      (id, entity, record_id, reason, detail, base_data, local_data, server_data, created_at,
       resolved_at, resolution)
      SELECT id, entity, record_id, reason, detail, base_data, local_data, server_data, created_at,
             resolved_at, resolution
        FROM sync_conflicts;
    DROP TABLE sync_conflicts;
    ALTER TABLE sync_conflicts_v6 RENAME TO sync_conflicts;
    CREATE INDEX idx_sync_conflicts_open ON sync_conflicts (created_at) WHERE resolved_at IS NULL;

    ${triggers}
  `;
}

/** v7 — património (bens e dívidas), na mesma fila. O sinal vem do tipo, não do valor. */
function migrationV7(): string {
  const uuid = `lower(
    hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-'
    || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-'
    || hex(randomblob(6)))`;
  const tracking = `(SELECT tracking = 1 AND applying_remote = 0 FROM sync_state WHERE id = 1)`;
  const entities = `('accounts', 'categories', 'budgets', 'subscriptions', 'goals', 'goal_contributions', 'wealth_items', 'entries')`;
  const json = (row: 'NEW' | 'OLD', fields: readonly string[]) =>
    `json_object(${fields.map((column) => `'${column}', ${row}.${column}`).join(', ')})`;
  const synced = {
    accounts: [
      'name',
      'type',
      'currency',
      'initial_balance',
      'archived_at',
      'created_at',
      'deleted_at',
    ],
    categories: ['name', 'type', 'icon', 'color', 'system_key', 'created_at', 'deleted_at'],
    budgets: [
      'category_id',
      'amount',
      'currency',
      'period',
      'starts_on',
      'created_at',
      'deleted_at',
    ],
    subscriptions: [
      'name',
      'amount',
      'currency',
      'period',
      'status',
      'starts_on',
      'next_on',
      'category_id',
      'created_at',
      'deleted_at',
    ],
    goals: ['name', 'target_amount', 'currency', 'target_on', 'created_at', 'deleted_at'],
    goal_contributions: ['goal_id', 'amount', 'date', 'created_at', 'deleted_at'],
    wealth_items: ['name', 'type', 'amount', 'currency', 'valued_on', 'created_at', 'deleted_at'],
    entries: [
      'type',
      'amount',
      'description',
      'notes',
      'category_id',
      'account_id',
      'destination_account_id',
      'date',
      'created_at',
      'deleted_at',
    ],
  } as const;
  const triggers = Object.entries(synced)
    .map(([table, fields]) => {
      const nextBase = `COALESCE(
        (SELECT base_version + 1 FROM sync_outbox
          WHERE entity = '${table}' AND record_id = NEW.id ORDER BY seq DESC LIMIT 1),
        OLD.version)`;
      const insertBase = `COALESCE(
        (SELECT base_version + 1 FROM sync_outbox
          WHERE entity = '${table}' AND record_id = NEW.id ORDER BY seq DESC LIMIT 1),
        NEW.version)`;
      return `
        DROP TRIGGER IF EXISTS sync_${table}_insert;
        DROP TRIGGER IF EXISTS sync_${table}_update;
        CREATE TRIGGER sync_${table}_insert AFTER INSERT ON ${table}
        WHEN ${tracking}
        BEGIN
          INSERT INTO sync_outbox (op_id, tx_id, entity, record_id, base_version, base, data, created_at)
          VALUES (${uuid}, (SELECT current_tx FROM sync_state WHERE id = 1), '${table}', NEW.id,
            ${insertBase}, NULL, ${json('NEW', fields)}, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
        END;
        CREATE TRIGGER sync_${table}_update AFTER UPDATE ON ${table}
        WHEN ${tracking}
        BEGIN
          INSERT INTO sync_outbox (op_id, tx_id, entity, record_id, base_version, base, data, created_at)
          VALUES (${uuid}, (SELECT current_tx FROM sync_state WHERE id = 1), '${table}', NEW.id,
            ${nextBase}, ${json('OLD', fields)}, ${json('NEW', fields)},
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
        END;`;
    })
    .join('\n');

  return `
    CREATE TABLE wealth_items (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
      type TEXT NOT NULL CHECK (type IN (
        'property', 'investment', 'retirement', 'valuables', 'other_asset',
        'mortgage', 'loan', 'credit', 'other_debt')),
      amount INTEGER NOT NULL CHECK (typeof(amount) = 'integer' AND amount > 0),
      currency TEXT NOT NULL CHECK (length(currency) = 3 AND currency = upper(currency)),
      valued_on TEXT NOT NULL CHECK (valued_on GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
      version INTEGER NOT NULL DEFAULT 0,
      server_seq INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      synced_at TEXT
    );

    DROP TRIGGER IF EXISTS sync_accounts_insert;
    DROP TRIGGER IF EXISTS sync_accounts_update;
    DROP TRIGGER IF EXISTS sync_categories_insert;
    DROP TRIGGER IF EXISTS sync_categories_update;
    DROP TRIGGER IF EXISTS sync_budgets_insert;
    DROP TRIGGER IF EXISTS sync_budgets_update;
    DROP TRIGGER IF EXISTS sync_subscriptions_insert;
    DROP TRIGGER IF EXISTS sync_subscriptions_update;
    DROP TRIGGER IF EXISTS sync_entries_insert;
    DROP TRIGGER IF EXISTS sync_goals_insert;
    DROP TRIGGER IF EXISTS sync_goals_update;
    DROP TRIGGER IF EXISTS sync_goal_contributions_insert;
    DROP TRIGGER IF EXISTS sync_goal_contributions_update;
    DROP TRIGGER IF EXISTS sync_entries_update;

    CREATE TABLE sync_outbox_v7 (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      op_id TEXT NOT NULL UNIQUE,
      tx_id TEXT,
      entity TEXT NOT NULL CHECK (entity IN ${entities}),
      record_id TEXT NOT NULL,
      base_version INTEGER NOT NULL CHECK (base_version >= 0),
      base TEXT,
      data TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL
    );
    INSERT INTO sync_outbox_v7
      (seq, op_id, tx_id, entity, record_id, base_version, base, data, attempts, last_error, created_at)
      SELECT seq, op_id, tx_id, entity, record_id, base_version, base, data, attempts, last_error, created_at
        FROM sync_outbox;
    DROP TABLE sync_outbox;
    ALTER TABLE sync_outbox_v7 RENAME TO sync_outbox;
    CREATE INDEX idx_sync_outbox_record ON sync_outbox (entity, record_id, seq);

    CREATE TABLE sync_inbox_v7 (
      server_seq INTEGER PRIMARY KEY,
      entity TEXT NOT NULL CHECK (entity IN ${entities}),
      data TEXT NOT NULL
    );
    INSERT INTO sync_inbox_v7 (server_seq, entity, data)
      SELECT server_seq, entity, data FROM sync_inbox;
    DROP TABLE sync_inbox;
    ALTER TABLE sync_inbox_v7 RENAME TO sync_inbox;

    CREATE TABLE sync_conflicts_v7 (
      id TEXT PRIMARY KEY NOT NULL,
      entity TEXT NOT NULL CHECK (entity IN ${entities}),
      record_id TEXT NOT NULL,
      reason TEXT NOT NULL CHECK (reason IN ('version', 'missing', 'rejected')),
      detail TEXT,
      base_data TEXT,
      local_data TEXT,
      server_data TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolution TEXT CHECK (resolution IS NULL OR resolution IN ('keepLocal', 'keepServer'))
    );
    INSERT INTO sync_conflicts_v7
      (id, entity, record_id, reason, detail, base_data, local_data, server_data, created_at,
       resolved_at, resolution)
      SELECT id, entity, record_id, reason, detail, base_data, local_data, server_data, created_at,
             resolved_at, resolution
        FROM sync_conflicts;
    DROP TABLE sync_conflicts;
    ALTER TABLE sync_conflicts_v7 RENAME TO sync_conflicts;
    CREATE INDEX idx_sync_conflicts_open ON sync_conflicts (created_at) WHERE resolved_at IS NULL;

    ${triggers}
  `;
}

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
