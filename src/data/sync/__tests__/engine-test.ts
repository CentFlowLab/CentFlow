import { randomUUID } from 'node:crypto';

import { assessBudget, type Account, type Category } from '@/core/finance';
import { createSyncEngine, SyncTransportError } from '@/data/sync';
import {
  createTestServer,
  type ServerSession,
  type TestServer,
} from '@/test-utils/supabase-server';
import { createTestDevice, type TestDevice } from '@/test-utils/sync-device';

jest.setTimeout(60_000);

let server: TestServer;
const devices: TestDevice[] = [];

beforeAll(async () => {
  server = await createTestServer();
});

afterAll(async () => {
  await server.close();
});

afterEach(async () => {
  for (const device of devices.splice(0)) await device.close();
});

async function newUser(): Promise<ServerSession> {
  return server.createUser(randomUUID());
}

async function device(session: ServerSession, options?: Parameters<typeof createTestDevice>[1]) {
  const created = await createTestDevice(session, options);
  devices.push(created);
  return created;
}

async function setup(device: TestDevice): Promise<{ account: Account; category: Category }> {
  const account = await device.repositories.accounts.create({
    name: 'Banco',
    type: 'bank',
    currency: 'EUR',
    initialBalance: 100000,
  });
  const category = await device.repositories.categories.create({
    name: 'Supermercado',
    type: 'expense',
    icon: 'cart-outline',
    color: 'green',
  });
  return { account, category };
}

function expense(account: Account, category: Category, amount: number, description = '') {
  return {
    type: 'expense' as const,
    amount,
    accountId: account.id,
    categoryId: category.id,
    destinationAccountId: null,
    date: '2026-11-08',
    description,
    notes: '',
  };
}

async function serverCount(session: ServerSession, table: string): Promise<number> {
  const [row] = await session.query<{ n: number }>(
    `select count(*)::int as n from public.${table} where deleted_at is null`,
  );
  return row!.n;
}

async function balanceOf(device: TestDevice, accountId: string): Promise<number | undefined> {
  const accounts = await device.repositories.accounts.listWithBalances();
  return accounts.find((account) => account.id === accountId)?.balance;
}

describe('sync engine', () => {
  it('uploads offline records and delivers them to another device', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { account, category } = await setup(phone);
    await phone.repositories.entries.create(expense(account, category, 4230, 'Mercearia'));
    await phone.repositories.entries.create({
      ...expense(account, category, 150000),
      type: 'income',
      categoryId: (
        await phone.repositories.categories.create({
          name: 'Salário',
          type: 'income',
          icon: 'briefcase-outline',
          color: 'blue',
        })
      ).id,
    });

    expect(await phone.engine.sync()).toMatchObject({ status: 'idle', pending: 0, conflicts: 0 });
    expect(await serverCount(user, 'entries')).toBe(2);
    expect(await laptop.engine.sync()).toMatchObject({ status: 'idle', pending: 0 });

    const { items } = await laptop.repositories.entries.list();
    expect(items.map((entry) => entry.description).sort()).toEqual(['', 'Mercearia']);
    expect(await balanceOf(laptop, account.id)).toBe(100000 - 4230 + 150000);
    expect(await balanceOf(laptop, account.id)).toBe(await balanceOf(phone, account.id));
  });

  it('still receives categories from a server without the essential column', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    await setup(phone);
    await phone.engine.sync();
    // Servidor antigo (sem a migração 20261111000300): as categorias chegam sem `essential`.
    const pull = laptop.transport.pull.bind(laptop.transport);
    laptop.transport.pull = async (since, limit) => {
      const page = await pull(since, limit);
      if (page.reset_required) return page;
      return {
        ...page,
        changes: page.changes.map((change) => {
          if (change.entity !== 'categories') return change;
          const row = { ...change.row };
          delete row.essential;
          return { ...change, row };
        }),
      };
    };
    expect(await laptop.engine.sync()).toMatchObject({ status: 'idle', pending: 0 });
    const categories = await laptop.repositories.categories.list('expense');
    expect(categories.length).toBeGreaterThan(0);
    expect(categories.every((category) => category.essential === false)).toBe(true);
  });

  it('keeps working offline and catches up when the connection returns', async () => {
    const user = await newUser();
    const phone = await device(user);
    phone.transport.online = false;
    const { account, category } = await setup(phone);
    await phone.repositories.entries.create(expense(account, category, 999));

    expect(await phone.engine.sync()).toMatchObject({ status: 'offline', pending: 3 });
    expect(await balanceOf(phone, account.id)).toBe(100000 - 999);

    phone.transport.online = true;
    expect(await phone.engine.sync()).toMatchObject({ status: 'idle', pending: 0 });
    expect(await serverCount(user, 'entries')).toBe(1);
  });

  it('never duplicates a write when the response is lost and the push is retried', async () => {
    const user = await newUser();
    const phone = await device(user);
    const { account, category } = await setup(phone);
    await phone.repositories.entries.create(expense(account, category, 500));

    phone.transport.dropNextPushResponse = true;
    expect((await phone.engine.sync()).status).toBe('offline');
    expect(await phone.engine.sync()).toMatchObject({ status: 'idle', pending: 0, conflicts: 0 });
    expect(await serverCount(user, 'accounts')).toBe(1);
    expect(await serverCount(user, 'entries')).toBe(1);
  });

  it('recovers when the response of a later edit is lost', async () => {
    const user = await newUser();
    const phone = await device(user);
    const { account } = await setup(phone);
    await phone.engine.sync();
    await phone.repositories.accounts.update(account.id, {
      name: 'Banco principal',
      type: 'bank',
      currency: 'EUR',
      initialBalance: 100000,
    });
    phone.transport.dropNextPushResponse = true;
    await phone.engine.sync();
    expect(await phone.engine.sync()).toMatchObject({ status: 'idle', pending: 0, conflicts: 0 });
    const [row] = await user.query<{ name: string; version: number }>(
      'select name, version from public.accounts where id = $1',
      [account.id],
    );
    expect(row).toEqual({ name: 'Banco principal', version: 2 });
  });

  it('sends several offline edits of the same record in order', async () => {
    const user = await newUser();
    const phone = await device(user);
    const { account, category } = await setup(phone);
    const entry = await phone.repositories.entries.create(expense(account, category, 100));
    for (const amount of [200, 300, 400]) {
      await phone.repositories.entries.update(entry.id, expense(account, category, amount));
    }
    expect(await phone.engine.sync()).toMatchObject({ status: 'idle', pending: 0, conflicts: 0 });
    const [row] = await user.query<{ amount: number; version: number }>(
      'select amount::int, version from public.entries where id = $1',
      [entry.id],
    );
    expect(row).toEqual({ amount: 400, version: 4 });
  });

  it('merges offline edits of different fields made on two devices', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { account, category } = await setup(phone);
    const entry = await phone.repositories.entries.create(expense(account, category, 1000, 'Café'));
    await phone.engine.sync();
    await laptop.engine.sync();

    await phone.repositories.entries.update(entry.id, expense(account, category, 1200, 'Café'));
    await laptop.repositories.entries.update(
      entry.id,
      expense(account, category, 1000, 'Café com amigos'),
    );
    await phone.engine.sync();
    expect(await laptop.engine.sync()).toMatchObject({ status: 'idle', pending: 0, conflicts: 0 });
    await phone.engine.sync();

    for (const each of [phone, laptop]) {
      expect(await each.repositories.entries.get(entry.id)).toMatchObject({
        amount: 1200,
        description: 'Café com amigos',
      });
    }
  });

  it('preserves a conflicting edit and lets the user keep it', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { account, category } = await setup(phone);
    const entry = await phone.repositories.entries.create(expense(account, category, 1000));
    await phone.engine.sync();
    await laptop.engine.sync();

    await phone.repositories.entries.update(entry.id, expense(account, category, 1100));
    await laptop.repositories.entries.update(entry.id, expense(account, category, 1300));
    await phone.engine.sync();
    expect(await laptop.engine.sync()).toMatchObject({ status: 'idle', pending: 0, conflicts: 1 });

    // O servidor mantém a primeira versão confirmada; a do portátil fica preservada.
    expect((await laptop.repositories.entries.get(entry.id))?.amount).toBe(1100);
    const [conflict] = await laptop.engine.listConflicts();
    expect(conflict).toMatchObject({
      entity: 'entries',
      recordId: entry.id,
      reason: 'version',
      detail: 'amount,quantity_milli,odometer_km,principal_amount,interest_amount,fees_amount',
      local: { amount: 1300 },
      server: { amount: 1100 },
      base: { amount: 1000 },
    });

    await laptop.engine.resolveConflict(conflict!.id, 'keepLocal');
    expect(await laptop.engine.sync()).toMatchObject({ pending: 0, conflicts: 0 });
    await phone.engine.sync();
    expect((await phone.repositories.entries.get(entry.id))?.amount).toBe(1300);
  });

  it('keeps the server version when the user chooses it', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { account } = await setup(phone);
    await phone.engine.sync();
    await laptop.engine.sync();
    const rename = (name: string) => ({
      name,
      type: 'bank' as const,
      currency: 'EUR',
      initialBalance: 100000,
    });
    await phone.repositories.accounts.update(account.id, rename('Conta A'));
    await laptop.repositories.accounts.update(account.id, rename('Conta B'));
    await phone.engine.sync();
    await laptop.engine.sync();
    const [conflict] = await laptop.engine.listConflicts();
    await laptop.engine.resolveConflict(conflict!.id, 'keepServer');
    expect(await laptop.engine.sync()).toMatchObject({ pending: 0, conflicts: 0 });
    expect((await laptop.repositories.accounts.get(account.id))?.name).toBe('Conta A');
  });

  it('never silently loses an edit made while another device deleted the record', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { account, category } = await setup(phone);
    const entry = await phone.repositories.entries.create(expense(account, category, 1000));
    await phone.engine.sync();
    await laptop.engine.sync();

    await phone.repositories.entries.delete(entry.id);
    await laptop.repositories.entries.update(entry.id, expense(account, category, 2000, 'Editado'));
    await phone.engine.sync();
    expect(await laptop.engine.sync()).toMatchObject({ conflicts: 1 });
    const [conflict] = await laptop.engine.listConflicts();
    expect(conflict).toMatchObject({ detail: 'deleted_at', local: { amount: 2000 } });

    await laptop.engine.resolveConflict(conflict!.id, 'keepLocal');
    await laptop.engine.sync();
    await phone.engine.sync();
    expect(await phone.repositories.entries.get(entry.id)).toMatchObject({
      amount: 2000,
      description: 'Editado',
    });
  });

  it('propagates deletions so records do not come back on other devices', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { account, category } = await setup(phone);
    const entry = await phone.repositories.entries.create(expense(account, category, 700));
    await phone.engine.sync();
    await laptop.engine.sync();
    expect((await laptop.repositories.entries.list()).total).toBe(1);

    await laptop.repositories.entries.delete(entry.id);
    await laptop.engine.sync();
    await phone.engine.sync();
    expect((await phone.repositories.entries.list()).total).toBe(0);
    expect(await serverCount(user, 'entries')).toBe(0);
    // Uma nova sincronização não ressuscita nada.
    await phone.engine.sync();
    await laptop.engine.sync();
    expect((await laptop.repositories.entries.list()).total).toBe(0);
  });

  it('applies an account deletion with its entries as one atomic group', async () => {
    const user = await newUser();
    const phone = await device(user);
    const { account, category } = await setup(phone);
    await phone.repositories.entries.create(expense(account, category, 100));
    await phone.repositories.entries.create(expense(account, category, 200));
    await phone.engine.sync();
    await phone.repositories.accounts.deleteWithEntries(account.id);
    expect(await phone.engine.sync()).toMatchObject({ pending: 0, conflicts: 0 });
    expect(await serverCount(user, 'entries')).toBe(0);
    expect(await serverCount(user, 'accounts')).toBe(0);
  });

  it('keeps an entry rejected by the server and lets the user discard it', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { account, category } = await setup(phone);
    await phone.engine.sync();
    await laptop.engine.sync();

    await phone.repositories.accounts.delete(account.id);
    const orphan = await laptop.repositories.entries.create(expense(account, category, 300));
    await phone.engine.sync();
    expect(await laptop.engine.sync()).toMatchObject({ pending: 1, conflicts: 1 });
    const [conflict] = await laptop.engine.listConflicts();
    expect(conflict).toMatchObject({
      reason: 'rejected',
      detail: 'account_unavailable',
      recordId: orphan.id,
    });
    // A alteração rejeitada continua guardada no dispositivo até o utilizador decidir.
    expect(await laptop.repositories.entries.get(orphan.id)).not.toBeNull();

    await laptop.engine.resolveConflict(conflict!.id, 'keepServer');
    expect(await laptop.engine.sync()).toMatchObject({ pending: 0, conflicts: 0 });
    expect(await laptop.repositories.entries.get(orphan.id)).toBeNull();
  });

  it('does not duplicate default categories seeded on two devices', async () => {
    const user = await newUser();
    const phone = await device(user, { seed: true });
    const laptop = await device(user, { seed: true });
    await phone.engine.sync();
    expect(await laptop.engine.sync()).toMatchObject({ pending: 0, conflicts: 0 });
    expect(await serverCount(user, 'categories')).toBe(15);
    expect((await laptop.repositories.categories.list()).length).toBe(15);
  });

  it('resumes an interrupted download without losing or duplicating changes', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user, { pageSize: 2 });
    const { account, category } = await setup(phone);
    for (const amount of [1, 2, 3, 4, 5]) {
      await phone.repositories.entries.create(expense(account, category, amount));
    }
    await phone.engine.sync();

    const pull = laptop.transport.pull.bind(laptop.transport);
    let calls = 0;
    laptop.transport.pull = async (since, limit) => {
      calls += 1;
      if (calls === 3) laptop.transport.online = false;
      return pull(since, limit);
    };
    expect((await laptop.engine.sync()).status).toBe('offline');
    expect((await laptop.repositories.entries.list()).total).toBe(0);

    laptop.transport.online = true;
    expect(await laptop.engine.sync()).toMatchObject({ status: 'idle' });
    expect((await laptop.repositories.entries.list()).total).toBe(5);
    expect(await balanceOf(laptop, account.id)).toBe(100000 - 15);
  });

  it('rebuilds the local copy after the server purges old deletions', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { account, category } = await setup(phone);
    const keep = await phone.repositories.entries.create(expense(account, category, 10));
    const gone = await phone.repositories.entries.create(expense(account, category, 20));
    await phone.engine.sync();
    await laptop.engine.sync();

    await phone.repositories.entries.delete(gone.id);
    await phone.repositories.entries.update(keep.id, expense(account, category, 11));
    await phone.engine.sync();
    // Eliminação antiga purgada pelo servidor (tarefa administrativa).
    await server.pg.query(
      `update public.entries set deleted_at = now() - interval '400 days' where id = $1`,
      [gone.id],
    );
    await server.pg.query(`select public.purge_deleted()`);

    expect(await laptop.engine.sync()).toMatchObject({ status: 'idle', pending: 0, conflicts: 0 });
    expect(await laptop.db.first('SELECT id FROM entries WHERE id = ?', [gone.id])).toBeNull();
    expect((await laptop.repositories.entries.get(keep.id))?.amount).toBe(11);
  });

  it('repairs a local copy that drifted from the server', async () => {
    const user = await newUser();
    const phone = await device(user);
    const { account, category } = await setup(phone);
    const entry = await phone.repositories.entries.create(expense(account, category, 10));
    await phone.engine.sync();
    await phone.db.run('UPDATE sync_state SET applying_remote = 1 WHERE id = 1');
    await phone.db.run('DELETE FROM entries WHERE id = ?', [entry.id]);
    await phone.db.run('UPDATE sync_state SET applying_remote = 0 WHERE id = 1');

    expect(await phone.engine.sync()).toMatchObject({ status: 'idle', pending: 0 });
    expect((await phone.repositories.entries.get(entry.id))?.amount).toBe(10);
  });
});

function budgetInput(categoryId: string, amount = 5000) {
  return {
    categoryId,
    amount,
    currency: 'EUR',
    period: 'monthly' as const,
    startsOn: '2026-11-01',
  };
}

describe('budget sync', () => {
  it('keeps an offline budget and uploads it once', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { category } = await setup(phone);
    phone.transport.online = false;
    const created = await phone.repositories.budgets.create(budgetInput(category.id));
    expect(await phone.engine.sync()).toMatchObject({ status: 'offline' });
    expect(await phone.repositories.budgets.list()).toHaveLength(1);
    expect(await serverCount(user, 'budgets')).toBe(0);

    phone.transport.online = true;
    expect(await phone.engine.sync()).toMatchObject({ status: 'idle', pending: 0, conflicts: 0 });
    expect(await phone.engine.sync()).toMatchObject({ pending: 0, conflicts: 0 });
    expect(await serverCount(user, 'budgets')).toBe(1);
    await laptop.engine.sync();
    expect(await laptop.repositories.budgets.list()).toEqual([
      expect.objectContaining({ id: created.id, amount: 5000, categoryId: category.id }),
    ]);
  });

  it('merges distinct fields and keeps a conflicting edit', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { category } = await setup(phone);
    const created = await phone.repositories.budgets.create(budgetInput(category.id, 5000));
    await phone.engine.sync();
    await laptop.engine.sync();

    await phone.repositories.budgets.update(created.id, budgetInput(category.id, 7000));
    await laptop.repositories.budgets.update(created.id, {
      ...budgetInput(category.id, 5000),
      period: 'yearly',
    });
    await phone.engine.sync();
    expect(await laptop.engine.sync()).toMatchObject({ pending: 0, conflicts: 0 });
    await phone.engine.sync();
    for (const each of [phone, laptop]) {
      expect(await each.repositories.budgets.get(created.id)).toMatchObject({
        amount: 7000,
        period: 'yearly',
      });
    }
  });

  it('does not let an older edit replace a newer one', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { category } = await setup(phone);
    const created = await phone.repositories.budgets.create(budgetInput(category.id, 5000));
    await phone.engine.sync();
    await laptop.engine.sync();

    await phone.repositories.budgets.update(created.id, budgetInput(category.id, 6000));
    await laptop.repositories.budgets.update(created.id, budgetInput(category.id, 9000));
    await phone.engine.sync();
    expect(await laptop.engine.sync()).toMatchObject({ conflicts: 1 });
    const [conflict] = await laptop.engine.listConflicts();
    expect(conflict).toMatchObject({
      entity: 'budgets',
      recordId: created.id,
      reason: 'version',
      local: { amount: 9000 },
      server: { amount: 6000 },
    });
    await laptop.engine.resolveConflict(conflict!.id, 'keepLocal');
    await laptop.engine.sync();
    await phone.engine.sync();
    expect((await phone.repositories.budgets.get(created.id))?.amount).toBe(9000);
  });

  it('propagates a deletion and does not bring the budget back', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { account, category } = await setup(phone);
    const created = await phone.repositories.budgets.create(budgetInput(category.id));
    await phone.repositories.entries.create(expense(account, category, 1500, 'Pão'));
    await phone.engine.sync();
    await laptop.engine.sync();

    laptop.transport.online = false;
    await laptop.repositories.budgets.delete(created.id);
    expect(await laptop.repositories.budgets.list()).toHaveLength(0);
    expect((await laptop.repositories.entries.list()).total).toBe(1);
    laptop.transport.online = true;
    await laptop.engine.sync();
    await phone.engine.sync();
    expect(await phone.repositories.budgets.list()).toHaveLength(0);
    expect((await phone.repositories.entries.list()).total).toBe(1);
    await phone.engine.sync();
    await laptop.engine.sync();
    expect(await serverCount(user, 'budgets')).toBe(0);
    expect(await serverCount(user, 'entries')).toBe(1);
    expect(await laptop.repositories.budgets.list()).toHaveLength(0);
  });

  it('rejects a second active budget for the same category without losing either copy', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { category } = await setup(phone);
    await phone.engine.sync();
    await laptop.engine.sync();
    const winner = await phone.repositories.budgets.create(budgetInput(category.id, 4000));
    await phone.engine.sync();
    const other = await laptop.repositories.budgets.create(budgetInput(category.id, 9000));
    const synced = await laptop.engine.sync();
    expect(synced.conflicts).toBe(1);
    expect(await serverCount(user, 'budgets')).toBe(1);
    const [conflict] = await laptop.engine.listConflicts();
    expect(conflict).toMatchObject({
      reason: 'rejected',
      detail: 'duplicate_budget',
      recordId: other.id,
      local: { amount: 9000 },
    });
    await laptop.engine.resolveConflict(conflict!.id, 'keepLocal');
    await laptop.engine.sync();
    await phone.engine.sync();
    expect(await serverCount(user, 'budgets')).toBe(1);
    expect((await phone.repositories.budgets.get(other.id))?.amount).toBe(9000);
    expect(await phone.repositories.budgets.get(winner.id)).toBeNull();
  });

  it('counts only real expenses after the budget arrives on another device', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { account, category } = await setup(phone);
    const cash = await phone.repositories.accounts.create({
      name: 'Dinheiro',
      type: 'cash',
      currency: 'EUR',
      initialBalance: 0,
    });
    const income = await phone.repositories.categories.create({
      name: 'Salário',
      type: 'income',
      icon: 'briefcase-outline',
      color: 'blue',
    });
    await phone.repositories.budgets.create(budgetInput(category.id, 10000));
    await phone.repositories.entries.create(expense(account, category, 4230, 'Compras'));
    await phone.repositories.entries.create({
      ...expense(account, income, 20000, 'Salário'),
      type: 'income',
    });
    await phone.repositories.entries.create({
      type: 'transfer',
      amount: 500,
      description: '',
      notes: '',
      accountId: account.id,
      categoryId: null,
      destinationAccountId: cash.id,
      date: '2026-11-08',
    });
    await phone.engine.sync();
    await laptop.engine.sync();

    const budget = (await laptop.repositories.budgets.list())[0];
    const accounts = await laptop.repositories.accounts.list();
    const currency = new Map(accounts.map((item) => [item.id, item.currency]));
    const lines = (await laptop.repositories.entries.list({ limit: 20 })).items.map((item) => ({
      type: item.type,
      amount: item.amount,
      categoryId: item.categoryId,
      currency: currency.get(item.accountId) ?? '',
      date: item.date,
    }));
    expect(budget).toBeDefined();
    expect(
      assessBudget(
        {
          categoryId: budget!.categoryId,
          currency: budget!.currency,
          period: budget!.period,
          startsOn: budget!.startsOn,
          amount: budget!.amount,
        },
        lines,
        '2026-11-08',
      ).figures.spent,
    ).toBe(4230);
  });

  it('downloads a budget that an older cursor had skipped', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { category } = await setup(phone);
    const created = await phone.repositories.budgets.create(budgetInput(category.id, 6400));
    await phone.engine.sync();
    const counts = await phone.transport.counts();
    await laptop.db.run('UPDATE sync_state SET pull_cursor = ? WHERE id = 1', [counts.last_seq]);

    expect(await laptop.repositories.budgets.list()).toHaveLength(0);
    expect(await laptop.engine.sync()).toMatchObject({ status: 'idle', pending: 0, conflicts: 0 });
    expect(await laptop.repositories.budgets.get(created.id)).toMatchObject({ amount: 6400 });
  });

  it('removes the budget when its category is deleted and keeps the transactions', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { account, category } = await setup(phone);
    const other = await phone.repositories.categories.create({
      name: 'Casa',
      type: 'expense',
      icon: 'home-outline',
      color: 'indigo',
    });
    await phone.repositories.budgets.create(budgetInput(category.id));
    await phone.repositories.entries.create(expense(account, other, 1500, 'Renda'));
    await phone.engine.sync();
    await laptop.engine.sync();

    await phone.repositories.categories.delete(category.id);
    expect(await phone.engine.sync()).toMatchObject({ status: 'idle', pending: 0, conflicts: 0 });
    await laptop.engine.sync();
    expect(await laptop.repositories.budgets.list()).toHaveLength(0);
    expect((await laptop.repositories.entries.list()).total).toBe(1);
    expect(await serverCount(user, 'entries')).toBe(1);
    expect(await serverCount(user, 'budgets')).toBe(0);
    expect(
      await user.query<{ version: number; n: number }>(
        'select version::int as version, count(*)::int as n from public.budgets group by version',
      ),
    ).toEqual([{ version: 2, n: 1 }]);
  });

  it('sends the budget deletion and waits before deleting the category', async () => {
    const user = await newUser();
    const phone = await device(user);
    const { category } = await setup(phone);
    await phone.repositories.budgets.create(budgetInput(category.id));
    await phone.engine.sync();

    await phone.repositories.categories.delete(category.id);
    const queued = await phone.db.all<{ entity: string; tx_id: string }>(
      'SELECT entity, tx_id FROM sync_outbox ORDER BY seq',
    );
    expect(queued.map((row) => row.entity)).toEqual(['budgets', 'categories']);
    expect(queued[0]!.tx_id).not.toBe(queued[1]!.tx_id);

    const pushes: string[][] = [];
    const engine = createSyncEngine({
      store: phone.sync,
      transport: {
        ...phone.transport,
        push: async (ops) => {
          pushes.push(ops.map((op) => op.entity));
          if (pushes.length > 1) throw new SyncTransportError('network');
          return phone.transport.push(ops);
        },
      },
    });
    expect(await engine.sync()).toMatchObject({ status: 'offline' });
    expect(pushes[0]).toEqual(['budgets']);
    expect(await serverCount(user, 'budgets')).toBe(0);
    expect(
      await user.query<{ live: boolean }>(
        'select deleted_at is null as live from public.categories',
      ),
    ).toEqual([{ live: true }]);
    expect(await phone.repositories.categories.list()).toEqual([]);

    expect(await phone.engine.sync()).toMatchObject({ status: 'idle', pending: 0, conflicts: 0 });
    expect(
      await user.query<{ live: boolean }>(
        'select deleted_at is null as live from public.categories',
      ),
    ).toEqual([{ live: false }]);
    expect(
      await user.query<{ version: number; n: number }>(
        'select version::int as version, count(*)::int as n from public.budgets group by version',
      ),
    ).toEqual([{ version: 2, n: 1 }]);
  });

  it('deletes a category that has no budget and keeps reassigned transactions', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { account, category } = await setup(phone);
    const other = await phone.repositories.categories.create({
      name: 'Casa',
      type: 'expense',
      icon: 'home-outline',
      color: 'indigo',
    });
    const spare = await phone.repositories.categories.create({
      name: 'Lazer',
      type: 'expense',
      icon: 'film-outline',
      color: 'purple',
    });
    await phone.repositories.entries.create(expense(account, category, 1500, 'Pão'));
    await phone.engine.sync();
    await laptop.engine.sync();

    await phone.repositories.categories.delete(spare.id);
    await phone.repositories.categories.delete(category.id, { reassignTo: other.id });
    expect(await phone.engine.sync()).toMatchObject({ status: 'idle', pending: 0, conflicts: 0 });
    await laptop.engine.sync();
    expect(await serverCount(user, 'budgets')).toBe(0);
    expect(await serverCount(user, 'entries')).toBe(1);
    expect((await laptop.repositories.entries.list()).items[0]?.categoryId).toBe(other.id);
  });

  it('keeps one deleted budget when the other device still has an edit', async () => {
    const user = await newUser();
    const phone = await device(user);
    const laptop = await device(user);
    const { account, category } = await setup(phone);
    const other = await phone.repositories.categories.create({
      name: 'Casa',
      type: 'expense',
      icon: 'home-outline',
      color: 'indigo',
    });
    const created = await phone.repositories.budgets.create(budgetInput(category.id, 5000));
    await phone.repositories.entries.create(expense(account, other, 1500, 'Renda'));
    await phone.engine.sync();
    await laptop.engine.sync();

    laptop.transport.online = false;
    await laptop.repositories.budgets.update(created.id, budgetInput(category.id, 9000));
    laptop.transport.online = true;
    await phone.repositories.categories.delete(category.id);
    expect(await phone.engine.sync()).toMatchObject({ status: 'idle', pending: 0, conflicts: 0 });

    expect(await laptop.engine.sync()).toMatchObject({ conflicts: 1 });
    const [conflict] = await laptop.engine.listConflicts();
    expect(conflict).toMatchObject({ entity: 'budgets', recordId: created.id, reason: 'version' });
    await laptop.engine.resolveConflict(conflict!.id, 'keepServer');
    await laptop.engine.sync();
    expect(await laptop.repositories.budgets.list()).toHaveLength(0);
    expect(await laptop.repositories.categories.get(category.id)).toBeNull();
    expect((await laptop.repositories.entries.list()).total).toBe(1);
    expect(
      await user.query<{ version: number; gone: number; n: number }>(
        `select version::int as version,
                count(*) filter (where deleted_at is not null)::int as gone,
                count(*)::int as n
           from public.budgets
          group by version`,
      ),
    ).toEqual([{ version: 2, gone: 1, n: 1 }]);
  });

  it('does not report success when the new pull is unavailable', async () => {
    const user = await newUser();
    const phone = await device(user);
    const { category } = await setup(phone);
    await phone.repositories.budgets.create(budgetInput(category.id));
    const engine = createSyncEngine({
      store: phone.sync,
      transport: {
        ...phone.transport,
        pull: async () => {
          throw new SyncTransportError('server', 'PGRST202');
        },
      },
    });
    expect(await engine.sync()).toMatchObject({ status: 'error' });
    expect(await phone.repositories.budgets.list()).toHaveLength(1);
  });

  it('does not duplicate a budget when the push response is lost', async () => {
    const user = await newUser();
    const phone = await device(user);
    const { category } = await setup(phone);
    await phone.repositories.budgets.create(budgetInput(category.id, 3200));
    phone.transport.dropNextPushResponse = true;
    expect((await phone.engine.sync()).status).toBe('offline');
    expect(await phone.engine.sync()).toMatchObject({ status: 'idle', pending: 0, conflicts: 0 });
    expect(await serverCount(user, 'budgets')).toBe(1);
  });
});
