import { initializeDatabase } from '@/data/db/initialize';
import {
  getSchemaVersion,
  LATEST_SCHEMA_VERSION,
  MIGRATIONS,
  migrate,
  SchemaTooNewError,
  type Migration,
} from '@/data/db/migrations';
import { createSqlDatabase, DatabaseError, type SqlDatabase } from '@/data/db/sql-database';
import {
  createNodeSqliteDriver,
  createTempDirectory,
  openTestDatabase,
} from '@/test-utils/node-sqlite-driver';

const NOW = '2026-11-08T10:00:00.000Z';

async function insertAccount(db: SqlDatabase, id: string, currency = 'EUR') {
  await db.run(
    `INSERT INTO accounts (id, name, type, currency, initial_balance, created_at, updated_at)
     VALUES (?, 'Conta', 'bank', ?, 0, ?, ?)`,
    [id, currency, NOW, NOW],
  );
}

async function insertCategory(db: SqlDatabase, id: string, type = 'expense') {
  await db.run(
    `INSERT INTO categories (id, name, type, icon, color, created_at, updated_at)
     VALUES (?, 'Cat', ?, 'home', 'indigo', ?, ?)`,
    [id, type, NOW, NOW],
  );
}

function insertEntry(
  db: SqlDatabase,
  values: Partial<
    Record<
      'id' | 'type' | 'category_id' | 'account_id' | 'destination_account_id' | 'date',
      string | null
    >
  > & {
    amount?: number;
  },
) {
  const row = {
    id: 'e1',
    type: 'expense',
    amount: 100,
    category_id: 'c1',
    account_id: 'a1',
    destination_account_id: null,
    date: '2026-11-08',
    ...values,
  };
  return db.run(
    `INSERT INTO entries (id, type, amount, category_id, account_id, destination_account_id, date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.type,
      row.amount,
      row.category_id,
      row.account_id,
      row.destination_account_id,
      row.date,
      NOW,
      NOW,
    ],
  );
}

describe('database initialization', () => {
  it('creates the schema and records the version', async () => {
    const db = await openTestDatabase();
    expect(await getSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);
    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    expect(tables.map((table) => table.name)).toEqual([
      'accounts',
      'budgets',
      'categories',
      'documents',
      'entries',
      'goal_contributions',
      'goals',
      'meta',
      'subscriptions',
      'sync_conflicts',
      'sync_inbox',
      'sync_outbox',
      'sync_state',
      'vehicles',
      'wealth_items',
    ]);
    const indexes = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'",
    );
    expect(indexes.length).toBeGreaterThanOrEqual(7);
    await db.close();
  });

  it('enables foreign keys on the connection', async () => {
    const db = await openTestDatabase();
    expect(await db.first('PRAGMA foreign_keys')).toEqual({ foreign_keys: 1 });
    await db.close();
  });

  it('is idempotent when reopened', async () => {
    const dir = createTempDirectory();
    try {
      const first = await openTestDatabase(dir.file('app.db'));
      await first.close();
      const second = await openTestDatabase(dir.file('app.db'));
      expect(await getSchemaVersion(second)).toBe(LATEST_SCHEMA_VERSION);
      await second.close();
    } finally {
      dir.remove();
    }
  });

  it('refuses a schema newer than the app supports', async () => {
    const dir = createTempDirectory();
    try {
      const db = await openTestDatabase(dir.file('app.db'));
      await db.exec(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION + 1}`);
      await db.close();
      await expect(
        initializeDatabase(createNodeSqliteDriver(dir.file('app.db')), { useWriteAheadLog: false }),
      ).rejects.toBeInstanceOf(SchemaTooNewError);
    } finally {
      dir.remove();
    }
  });

  it('rolls back a failed migration completely', async () => {
    const db = createSqlDatabase(createNodeSqliteDriver());
    const migrations: Migration[] = [
      { version: 1, description: 'ok', sql: 'CREATE TABLE a (id TEXT);' },
      {
        version: 2,
        description: 'broken',
        sql: 'CREATE TABLE b (id TEXT); INSERT INTO missing VALUES (1);',
      },
    ];
    await expect(migrate(db, migrations)).rejects.toThrow();
    expect(await getSchemaVersion(db)).toBe(1);
    expect(await db.first("SELECT name FROM sqlite_master WHERE name = 'b'")).toBeNull();
    await db.close();
  });

  it('keeps budgets and pending operations when upgrading from schema v3', async () => {
    const db = createSqlDatabase(createNodeSqliteDriver());
    await db.exec('PRAGMA foreign_keys = ON;');
    await migrate(
      db,
      MIGRATIONS.filter((migration) => migration.version <= 3),
    );
    expect(await getSchemaVersion(db)).toBe(3);
    await db.run(
      `INSERT INTO categories (id, name, type, icon, color, created_at, updated_at)
       VALUES ('c1', 'Mercado', 'expense', 'cart-outline', 'green', ?, ?)`,
      [NOW, NOW],
    );
    await db.run(
      `INSERT INTO budgets
         (id, category_id, amount, currency, period, starts_on, created_at, updated_at)
       VALUES ('b1', 'c1', 5000, 'EUR', 'monthly', '2026-11-01', ?, ?)`,
      [NOW, NOW],
    );
    await db.run(
      `INSERT INTO sync_outbox (op_id, entity, record_id, base_version, data, created_at)
       VALUES ('op-1', 'categories', 'c1', 0, '{}', ?)`,
      [NOW],
    );

    await migrate(db, MIGRATIONS);

    expect(await getSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);
    expect(await db.first('SELECT amount, version FROM budgets WHERE id = ?', ['b1'])).toEqual({
      amount: 5000,
      version: 0,
    });
    expect(
      await db.first('SELECT entity, record_id FROM sync_outbox WHERE op_id = ?', ['op-1']),
    ).toEqual({ entity: 'categories', record_id: 'c1' });
    expect(
      await db.first<{ n: number }>(
        `SELECT COUNT(*) AS n FROM sqlite_master
          WHERE type = 'trigger' AND name = 'sync_budgets_insert'`,
      ),
    ).toEqual({ n: 1 });
    await db.close();
  });
});

describe('schema v12 (vehicle costs)', () => {
  it('keeps v11 entries, vehicles and documents and syncs the new fields', async () => {
    const db = createSqlDatabase(createNodeSqliteDriver());
    await db.exec('PRAGMA foreign_keys = ON;');
    await migrate(
      db,
      MIGRATIONS.filter((migration) => migration.version <= 11),
    );
    await insertAccount(db, 'a1');
    await insertCategory(db, 'c1');
    await db.run(
      `INSERT INTO entries (id, type, amount, description, search_text, category_id, account_id,
         date, created_at, updated_at)
       VALUES ('e1', 'expense', 24000, 'Pneus', 'pneus', 'c1', 'a1', '2026-11-05', ?, ?)`,
      [NOW, NOW],
    );
    await db.run(
      `INSERT INTO vehicles (id, name, kind, created_at, updated_at)
       VALUES ('v1', 'Clio', 'car', ?, ?)`,
      [NOW, NOW],
    );
    await db.run(
      `INSERT INTO documents (id, title, category, created_at, updated_at)
       VALUES ('d1', 'Seguro', 'insurance', ?, ?)`,
      [NOW, NOW],
    );
    await migrate(db, MIGRATIONS);

    expect(
      await db.first('SELECT amount, vehicle_id, vehicle_cost_type FROM entries WHERE id = ?', [
        'e1',
      ]),
    ).toEqual({ amount: 24000, vehicle_id: null, vehicle_cost_type: null });
    expect(await db.first('SELECT make, currency FROM vehicles')).toEqual({
      make: null,
      currency: null,
    });

    await db.run('UPDATE sync_state SET tracking = 1 WHERE id = 1');
    await db.run(
      `UPDATE entries SET vehicle_id = 'v1', vehicle_cost_type = 'tyres', odometer_km = 51000
        WHERE id = 'e1'`,
    );
    await db.run(`UPDATE vehicles SET make = 'Renault', year = 2019 WHERE id = 'v1'`);
    await db.run(`UPDATE documents SET vehicle_id = 'v1' WHERE id = 'd1'`);
    const last = async (entity: string) =>
      JSON.parse(
        (await db.first<{ data: string }>(
          'SELECT data FROM sync_outbox WHERE entity = ? ORDER BY seq DESC LIMIT 1',
          [entity],
        ))!.data,
      );
    expect(await last('entries')).toMatchObject({
      vehicle_id: 'v1',
      vehicle_cost_type: 'tyres',
      odometer_km: 51000,
      quantity_milli: null,
      amount: 24000,
    });
    expect(await last('vehicles')).toMatchObject({ make: 'Renault', year: 2019 });
    expect(await last('documents')).toMatchObject({ vehicle_id: 'v1' });

    // Valores impossíveis ficam fora mesmo sem passar pela validação da app.
    await expect(db.run(`UPDATE entries SET quantity_milli = 0 WHERE id = 'e1'`)).rejects.toThrow();
    await expect(
      db.run(`UPDATE entries SET vehicle_cost_type = 'boat' WHERE id = 'e1'`),
    ).rejects.toThrow();
    await db.close();
  });
});

describe('schema v11 (wealth closed date)', () => {
  it('keeps v10 items and sends the closed date through the outbox', async () => {
    const db = createSqlDatabase(createNodeSqliteDriver());
    await db.exec('PRAGMA foreign_keys = ON;');
    await migrate(
      db,
      MIGRATIONS.filter((migration) => migration.version <= 10),
    );
    await db.run(
      `INSERT INTO wealth_items (id, name, type, amount, currency, valued_on, created_at, updated_at)
       VALUES ('w1', 'Carro', 'valuables', 100, 'EUR', '2026-01-01', ?, ?)`,
      [NOW, NOW],
    );
    await migrate(db, MIGRATIONS);
    expect(await db.first('SELECT closed_on FROM wealth_items')).toEqual({ closed_on: null });
    await db.run('UPDATE sync_state SET tracking = 1 WHERE id = 1');
    await db.run(`UPDATE wealth_items SET closed_on = '2026-10-31' WHERE id = 'w1'`);
    const op = await db.first<{ data: string }>(
      `SELECT data FROM sync_outbox WHERE entity = 'wealth_items' ORDER BY seq DESC LIMIT 1`,
    );
    expect(JSON.parse(op!.data)).toMatchObject({ closed_on: '2026-10-31', value_history: null });
    await db.close();
  });
});

describe('schema v10 (wealth history, essential categories)', () => {
  it('keeps v9 rows and sends the new fields through the outbox', async () => {
    const db = createSqlDatabase(createNodeSqliteDriver());
    await db.exec('PRAGMA foreign_keys = ON;');
    await migrate(
      db,
      MIGRATIONS.filter((migration) => migration.version <= 9),
    );
    await db.run(
      `INSERT INTO categories (id, name, type, icon, color, created_at, updated_at)
       VALUES ('c1', 'Renda', 'expense', 'home', 'blue', ?, ?)`,
      [NOW, NOW],
    );
    await db.run(
      `INSERT INTO wealth_items (id, name, type, amount, currency, valued_on, created_at, updated_at)
       VALUES ('w1', 'Casa', 'property', 100, 'EUR', '2026-01-01', ?, ?)`,
      [NOW, NOW],
    );
    await migrate(db, MIGRATIONS);
    expect(await db.first('SELECT essential FROM categories')).toEqual({ essential: 0 });
    expect(await db.first('SELECT value_history FROM wealth_items')).toEqual({
      value_history: null,
    });

    await db.run('UPDATE sync_state SET tracking = 1 WHERE id = 1');
    await db.run(`UPDATE categories SET essential = 1 WHERE id = 'c1'`);
    await db.run(
      `UPDATE wealth_items SET amount = 200, valued_on = '2026-06-01',
         value_history = '[{"amount":100,"valued_on":"2026-01-01"}]' WHERE id = 'w1'`,
    );
    const ops = await db.all<{ entity: string; data: string }>(
      'SELECT entity, data FROM sync_outbox ORDER BY seq',
    );
    expect(JSON.parse(ops.find((op) => op.entity === 'categories')!.data)).toMatchObject({
      essential: 1,
    });
    expect(JSON.parse(ops.find((op) => op.entity === 'wealth_items')!.data)).toMatchObject({
      value_history: '[{"amount":100,"valued_on":"2026-01-01"}]',
    });
    await expect(
      db.run(`UPDATE wealth_items SET value_history = '{"not":"a list"}' WHERE id = 'w1'`),
    ).rejects.toThrow();
    await db.close();
  });
});

describe('schema v9 (subscription price)', () => {
  it('keeps subscriptions from v8 and sends the previous price through the outbox', async () => {
    const db = createSqlDatabase(createNodeSqliteDriver());
    await db.exec('PRAGMA foreign_keys = ON;');
    await migrate(
      db,
      MIGRATIONS.filter((migration) => migration.version <= 8),
    );
    await db.run(
      `INSERT INTO subscriptions
         (id, name, amount, currency, period, status, starts_on, next_on, created_at, updated_at)
       VALUES ('s1', 'Ginásio', 3000, 'EUR', 'monthly', 'active', '2026-11-01', '2026-12-01', ?, ?)`,
      [NOW, NOW],
    );
    await migrate(db, MIGRATIONS);
    expect(
      await db.first('SELECT amount, previous_amount, amount_changed_on FROM subscriptions'),
    ).toEqual({ amount: 3000, previous_amount: null, amount_changed_on: null });

    await db.run('UPDATE sync_state SET tracking = 1 WHERE id = 1');
    await db.run(
      `UPDATE subscriptions SET amount = 3500, previous_amount = 3000,
         amount_changed_on = '2026-11-11' WHERE id = 's1'`,
    );
    const op = await db.first<{ data: string }>(
      `SELECT data FROM sync_outbox WHERE entity = 'subscriptions' ORDER BY seq DESC LIMIT 1`,
    );
    expect(JSON.parse(op!.data)).toMatchObject({
      amount: 3500,
      previous_amount: 3000,
      amount_changed_on: '2026-11-11',
    });
    await expect(
      db.run(`UPDATE subscriptions SET previous_amount = -1 WHERE id = 's1'`),
    ).rejects.toThrow();
    await db.close();
  });
});

describe('integrity constraints', () => {
  let db: SqlDatabase;

  beforeEach(async () => {
    db = await openTestDatabase();
    await insertAccount(db, 'a1');
    await insertAccount(db, 'a2');
    await insertCategory(db, 'c1');
  });

  afterEach(() => db.close());

  it('accepts valid rows', async () => {
    await insertEntry(db, {});
    await insertEntry(db, {
      id: 'e2',
      type: 'transfer',
      category_id: null,
      destination_account_id: 'a2',
    });
    expect(await db.first('SELECT COUNT(*) AS n FROM entries')).toEqual({ n: 2 });
  });

  it('rejects references to missing accounts and categories', async () => {
    await expect(insertEntry(db, { account_id: 'ghost' })).rejects.toMatchObject({
      kind: 'foreignKey',
    });
    await expect(insertEntry(db, { category_id: 'ghost' })).rejects.toMatchObject({
      kind: 'foreignKey',
    });
  });

  it('prevents hard-deleting referenced rows', async () => {
    await insertEntry(db, {});
    await expect(db.run("DELETE FROM accounts WHERE id = 'a1'")).rejects.toBeInstanceOf(
      DatabaseError,
    );
    await expect(db.run("DELETE FROM categories WHERE id = 'c1'")).rejects.toBeInstanceOf(
      DatabaseError,
    );
  });

  it.each([
    ['zero amount', { amount: 0 }],
    ['negative amount', { amount: -5 }],
    ['fractional amount', { amount: 1.5 }],
    ['unknown type', { type: 'loan' }],
    ['expense without category', { category_id: null }],
    ['expense with destination', { destination_account_id: 'a2' }],
    ['transfer with category', { type: 'transfer', destination_account_id: 'a2' }],
    ['transfer without destination', { type: 'transfer', category_id: null }],
    [
      'transfer to same account',
      { type: 'transfer', category_id: null, destination_account_id: 'a1' },
    ],
    ['malformed date', { date: '08/11/2026' }],
  ])('rejects %s', async (_label, values) => {
    await expect(insertEntry(db, values)).rejects.toMatchObject({ kind: 'constraint' });
  });

  it('rejects invalid accounts', async () => {
    await expect(insertAccount(db, 'a3', 'eur')).rejects.toMatchObject({ kind: 'constraint' });
    await expect(
      db.run(
        `INSERT INTO accounts (id, name, type, currency, initial_balance, created_at, updated_at)
         VALUES ('a4', 'X', 'bank', 'EUR', 10.5, ?, ?)`,
        [NOW, NOW],
      ),
    ).rejects.toMatchObject({ kind: 'constraint' });
  });
});

describe('serialized access and transactions', () => {
  it('rolls back every statement of a failed transaction', async () => {
    const db = await openTestDatabase();
    await expect(
      db.transaction(async (tx) => {
        await tx.run(
          `INSERT INTO accounts (id, name, type, currency, created_at, updated_at)
           VALUES ('a1', 'A', 'bank', 'EUR', ?, ?)`,
          [NOW, NOW],
        );
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await db.first('SELECT COUNT(*) AS n FROM accounts')).toEqual({ n: 0 });
    await db.close();
  });

  it('keeps concurrent operations out of a running transaction', async () => {
    const db = await openTestDatabase();
    let releaseTransaction: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseTransaction = resolve;
    });

    const failing = db.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO accounts (id, name, type, currency, created_at, updated_at)
         VALUES ('inside', 'A', 'bank', 'EUR', ?, ?)`,
        [NOW, NOW],
      );
      await gate;
      throw new Error('rollback');
    });
    const outside = db.run(
      `INSERT INTO accounts (id, name, type, currency, created_at, updated_at)
       VALUES ('outside', 'B', 'bank', 'EUR', ?, ?)`,
      [NOW, NOW],
    );
    releaseTransaction();

    await expect(failing).rejects.toThrow('rollback');
    await outside;
    expect(await db.all('SELECT id FROM accounts')).toEqual([{ id: 'outside' }]);
    await db.close();
  });

  it('rejects use after close', async () => {
    const db = await openTestDatabase();
    await db.close();
    await expect(db.first('SELECT 1')).rejects.toBeInstanceOf(DatabaseError);
  });
});
