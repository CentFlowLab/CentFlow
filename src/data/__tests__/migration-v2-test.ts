import { DEFAULT_CATEGORIES } from '@/core/finance';
import { MIGRATIONS, migrate } from '@/data/db/migrations';
import { createSqlDatabase } from '@/data/db/sql-database';
import { initializeDatabase } from '@/data/db/initialize';
import { createSqliteRepositories } from '@/data/sqlite';
import {
  createNodeSqliteDriver,
  createTempDirectory,
  testId,
} from '@/test-utils/node-sqlite-driver';

const NOW = '2026-11-08T10:00:00.000Z';

type OutboxRow = {
  entity: string;
  record_id: string;
  base_version: number;
  tx_id: string | null;
  base: string | null;
  data: string;
};

describe('migration v2 from a Phase 1 database', () => {
  it('moves seeded default categories to fixed ids and keeps every entry', async () => {
    const dir = createTempDirectory();
    const path = dir.file('v1.db');
    try {
      // Base de dados da Fase 1: só a migração v1, categorias base semeadas com UUID aleatório.
      const v1 = createSqlDatabase(createNodeSqliteDriver(path));
      await v1.exec('PRAGMA foreign_keys = ON;');
      await migrate(v1, MIGRATIONS.slice(0, 1));
      const oldIds: string[] = [];
      for (const category of DEFAULT_CATEGORIES) {
        const id = testId();
        oldIds.push(id);
        await v1.run(
          `INSERT INTO categories (id, name, type, icon, color, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, `Nome ${category.key}`, category.type, category.icon, category.color, NOW, NOW],
        );
      }
      await v1.run(`INSERT INTO meta (key, value) VALUES ('seed.defaultCategories', ?)`, [NOW]);
      const custom = testId();
      await v1.run(
        `INSERT INTO categories (id, name, type, icon, color, created_at, updated_at)
         VALUES (?, 'Ginásio', 'expense', 'barbell-outline', 'red', ?, ?)`,
        [custom, NOW, NOW],
      );
      await v1.run(
        `INSERT INTO accounts (id, name, type, currency, initial_balance, created_at, updated_at)
         VALUES ('a1', 'Banco', 'bank', 'EUR', 1000, ?, ?)`,
        [NOW, NOW],
      );
      for (const [id, categoryId] of [
        ['e1', oldIds[1]],
        ['e2', custom],
      ] as const) {
        await v1.run(
          `INSERT INTO entries (id, type, amount, category_id, account_id, date, created_at, updated_at)
           VALUES (?, 'expense', 4230, ?, 'a1', '2026-11-08', ?, ?)`,
          [id, categoryId!, NOW, NOW],
        );
      }
      await v1.close();

      const db = await initializeDatabase(createNodeSqliteDriver(path), {
        useWriteAheadLog: false,
      });
      const categories = await db.all<{ id: string; name: string; system_key: string | null }>(
        'SELECT id, name, system_key FROM categories ORDER BY id',
      );
      expect(categories).toHaveLength(DEFAULT_CATEGORIES.length + 1);
      const groceries = DEFAULT_CATEGORIES.find((category) => category.key === 'groceries')!;
      expect(categories).toContainEqual({
        id: groceries.id,
        name: 'Nome groceries',
        system_key: 'groceries',
      });
      expect(categories).toContainEqual({ id: custom, name: 'Ginásio', system_key: null });
      expect(await db.all('SELECT id, category_id, amount FROM entries ORDER BY id')).toEqual([
        { id: 'e1', category_id: groceries.id, amount: 4230 },
        { id: 'e2', category_id: custom, amount: 4230 },
      ]);
      // Nada é registado para enviar: uma base local sem conta não sincroniza.
      expect(await db.all('SELECT * FROM sync_outbox')).toEqual([]);
      expect(await db.first('PRAGMA foreign_key_check')).toBeNull();
      await db.close();
    } finally {
      dir.remove();
    }
  });
});

describe('change tracking', () => {
  async function openTracked() {
    const db = await initializeDatabase(createNodeSqliteDriver(), { useWriteAheadLog: false });
    await db.run('UPDATE sync_state SET tracking = 1 WHERE id = 1');
    const repos = createSqliteRepositories(db, { newId: testId });
    const outbox = () =>
      db.all<OutboxRow>(
        'SELECT entity, record_id, base_version, tx_id, base, data FROM sync_outbox ORDER BY seq',
      );
    return { db, repos, outbox };
  }

  it('records nothing while tracking is off', async () => {
    const db = await initializeDatabase(createNodeSqliteDriver(), { useWriteAheadLog: false });
    const repos = createSqliteRepositories(db, { newId: testId });
    await repos.accounts.create({
      name: 'Banco',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 0,
    });
    expect(await db.all('SELECT * FROM sync_outbox')).toEqual([]);
    await db.close();
  });

  it('records every write with chained base versions and full row snapshots', async () => {
    const { db, repos, outbox } = await openTracked();
    const account = await repos.accounts.create({
      name: 'Banco',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 100000,
    });
    await repos.accounts.update(account.id, {
      name: 'Banco principal',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 100000,
    });
    const ops = await outbox();
    expect(ops.map((op) => [op.entity, op.base_version])).toEqual([
      ['accounts', 0],
      ['accounts', 1],
    ]);
    expect(ops[0]!.base).toBeNull();
    expect(JSON.parse(ops[0]!.data)).toMatchObject({ name: 'Banco', initial_balance: 100000 });
    expect(JSON.parse(ops[1]!.base!)).toMatchObject({ name: 'Banco' });
    expect(JSON.parse(ops[1]!.data)).toMatchObject({ name: 'Banco principal' });
    await db.close();
  });

  it('groups the writes of one transaction under the same transaction id', async () => {
    const { db, repos, outbox } = await openTracked();
    const account = await repos.accounts.create({
      name: 'Banco',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 0,
    });
    const category = await repos.categories.create({
      name: 'Casa',
      type: 'expense',
      icon: 'home-outline',
      color: 'indigo',
    });
    for (const amount of [100, 200]) {
      await repos.entries.create({
        type: 'expense',
        amount,
        accountId: account.id,
        categoryId: category.id,
        destinationAccountId: null,
        date: '2026-11-08',
        description: '',
        notes: '',
      });
    }
    await repos.accounts.deleteWithEntries(account.id);

    const ops = await outbox();
    const deletion = ops.slice(-3);
    expect(deletion.map((op) => op.entity)).toEqual(['entries', 'entries', 'accounts']);
    expect(new Set(deletion.map((op) => op.tx_id)).size).toBe(1);
    expect(deletion[0]!.tx_id).not.toBeNull();
    for (const op of deletion) expect(JSON.parse(op.data).deleted_at).not.toBeNull();
    await db.close();
  });

  it('does not record changes applied from the server', async () => {
    const { db, outbox } = await openTracked();
    await db.run('UPDATE sync_state SET applying_remote = 1 WHERE id = 1');
    await db.run(
      `INSERT INTO accounts (id, name, type, currency, initial_balance, created_at, updated_at, version)
       VALUES ('a1', 'Banco', 'bank', 'EUR', 0, ?, ?, 3)`,
      [NOW, NOW],
    );
    expect(await outbox()).toEqual([]);
    await db.close();
  });
});
