import initSqlJs, { type SqlJsStatic } from 'sql.js';

import { initializeDatabase } from '@/data/db/initialize';
import { LATEST_SCHEMA_VERSION } from '@/data/db/migrations';
import { createMemoryByteStore, createSqlJsDriver } from '@/data/db/sqljs-driver';
import { createLocalStore } from '@/data/sync';

let SQL: SqlJsStatic;
beforeAll(async () => {
  SQL = await initSqlJs();
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('sql.js driver (web without cross-origin isolation, ADR-060)', () => {
  it('migrates, keeps the data in the byte store and reopens it intact', async () => {
    const store = createMemoryByteStore();
    const driver = await createSqlJsDriver(SQL, 'centflow-u-test.db', store);
    const db = await initializeDatabase(driver, { useWriteAheadLog: false });
    const local = createLocalStore(db, { newId: () => crypto.randomUUID() });
    const account = await local.repositories.accounts.create({
      name: 'Banco',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 1000,
    });
    await tick();
    expect(await store.load('centflow-u-test.db')).not.toBeNull();
    await db.close();

    const reopened = await initializeDatabase(
      await createSqlJsDriver(SQL, 'centflow-u-test.db', store),
      { useWriteAheadLog: false },
    );
    expect(await reopened.first<{ user_version: number }>('PRAGMA user_version')).toEqual({
      user_version: LATEST_SCHEMA_VERSION,
    });
    const again = createLocalStore(reopened, { newId: () => crypto.randomUUID() });
    expect((await again.repositories.accounts.list()).map((item) => item.id)).toEqual([account.id]);
    await reopened.close();
  });

  it('keeps foreign keys on after each save and never saves a rolled-back transaction', async () => {
    const store = createMemoryByteStore();
    const driver = await createSqlJsDriver(SQL, 'x.db', store);
    const db = await initializeDatabase(driver, { useWriteAheadLog: false });
    await db.run(
      `INSERT INTO accounts (id, name, type, currency, initial_balance, created_at, updated_at)
       VALUES ('a1', 'Banco', 'bank', 'EUR', 0, 'now', 'now')`,
    );
    await tick();
    // A exportação reabre a ligação; as chaves estrangeiras têm de continuar ativas.
    expect(await db.first('PRAGMA foreign_keys')).toEqual({ foreign_keys: 1 });
    await expect(
      db.run(
        `INSERT INTO entries (id, type, amount, description, account_id, date, created_at,
           updated_at) VALUES ('e1', 'expense', 1, '', 'missing', '2026-11-12', 'now', 'now')`,
      ),
    ).rejects.toThrow();
    await expect(
      db.transaction(async (tx) => {
        await tx.run(`UPDATE accounts SET name = 'Outro' WHERE id = 'a1'`);
        throw new Error('stop');
      }),
    ).rejects.toThrow('stop');
    await driver.flush();
    const copy = new SQL.Database((await store.load('x.db')) ?? undefined);
    expect(copy.exec(`SELECT name FROM accounts`)[0]?.values).toEqual([['Banco']]);
    copy.close();
    await db.close();
  });
});
