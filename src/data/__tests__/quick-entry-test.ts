import type { SqlDatabase } from '@/data/db/sql-database';
import {
  buildQuickEntrySnapshot,
  importQueuedExpense,
  parseQueuedExpense,
  type QueuedExpense,
} from '@/data/quick-entry/quick-entry';
import type { Repositories } from '@/data/repositories/types';
import { openTestRepositories } from '@/test-utils/node-sqlite-driver';

let db: SqlDatabase;
let repos: Repositories;

beforeEach(async () => {
  ({ db, repos } = await openTestRepositories());
});

afterEach(() => db.close());

async function setup() {
  const savings = await repos.accounts.create({
    name: 'Poupança',
    type: 'savings',
    currency: 'EUR',
    initialBalance: 0,
  });
  const bank = await repos.accounts.create({
    name: 'Banco',
    type: 'bank',
    currency: 'EUR',
    initialBalance: 100000,
  });
  const food = await repos.categories.create({
    name: 'Supermercado',
    type: 'expense',
    icon: 'cart',
    color: 'green',
  });
  const fun = await repos.categories.create({
    name: 'Lazer',
    type: 'expense',
    icon: 'game-controller',
    color: 'violet',
  });
  return { savings, bank, food, fun };
}

function queued(overrides: Partial<QueuedExpense>): QueuedExpense {
  return {
    version: 1,
    amount: '12.35',
    description: 'Mercearia',
    categoryId: 'missing',
    accountId: 'missing',
    date: '2026-11-10',
    ...overrides,
  };
}

describe('quick entry snapshot', () => {
  it('has no account before there are accounts', async () => {
    expect(await buildQuickEntrySnapshot(repos)).toMatchObject({ version: 1, account: null });
  });

  it('prefers a bank account, then the one used last, and lists used categories first', async () => {
    const { savings, bank, food, fun } = await setup();
    let snapshot = await buildQuickEntrySnapshot(repos);
    expect(snapshot.account).toEqual({
      id: bank.id,
      name: 'Banco',
      currency: 'EUR',
      fractionDigits: 2,
    });

    await repos.entries.create({
      type: 'expense',
      amount: 500,
      description: '',
      categoryId: fun.id,
      accountId: savings.id,
      destinationAccountId: null,
      date: '2026-11-09',
      notes: null,
    });
    snapshot = await buildQuickEntrySnapshot(repos);
    expect(snapshot.account?.id).toBe(savings.id);
    const names = snapshot.categories.map((category) => category.name);
    expect(names[0]).toBe('Lazer');
    expect(names).toContain(food.name);
  });
});

describe('queued expenses', () => {
  it('accepts only well-formed items', () => {
    expect(parseQueuedExpense(JSON.stringify(queued({})))).toMatchObject({ amount: '12.35' });
    expect(parseQueuedExpense('not json')).toBeNull();
    expect(parseQueuedExpense(JSON.stringify(queued({ amount: '12,35' })))).toBeNull();
    expect(parseQueuedExpense(JSON.stringify(queued({ date: '2026-02-30' })))).toBeNull();
    expect(parseQueuedExpense(JSON.stringify({ ...queued({}), version: 2 }))).toBeNull();
    expect(
      parseQueuedExpense(JSON.stringify(queued({ description: `  ${'x'.repeat(200)}  ` })))
        ?.description,
    ).toHaveLength(140);
  });

  it('records the expense in minor units, in the chosen account and category', async () => {
    const { bank, food } = await setup();
    expect(
      await importQueuedExpense(repos, queued({ accountId: bank.id, categoryId: food.id })),
    ).toBe('imported');
    const { items } = await repos.entries.list();
    expect(items).toEqual([
      expect.objectContaining({
        type: 'expense',
        amount: 1235,
        description: 'Mercearia',
        categoryId: food.id,
        accountId: bank.id,
        date: '2026-11-10',
      }),
    ]);
  });

  it('falls back when the account or category was deleted, and refuses a zero amount', async () => {
    const { bank } = await setup();
    expect(await importQueuedExpense(repos, queued({}))).toBe('imported');
    expect((await repos.entries.list()).items[0]?.accountId).toBe(bank.id);
    expect(await importQueuedExpense(repos, queued({ amount: '0' }))).toBe('invalid');
  });
});
