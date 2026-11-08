import { randomUUID } from 'node:crypto';

import { DEFAULT_CATEGORIES } from '@/core/finance';
import { DatabaseUnavailableError } from '@/data/db/errors';
import { attachSpace } from '@/data/local-space';
import { ANONYMOUS_SPACE } from '@/data/spaces';
import { createLocalStore, type LocalStore } from '@/data/sync';
import { cancelImport, getImportState, runImport, shouldOfferImport } from '@/data/sync/import';
import { openTestDatabase, testId } from '@/test-utils/node-sqlite-driver';
import {
  createTestServer,
  type ServerSession,
  type TestServer,
} from '@/test-utils/supabase-server';
import { createTestDevice, type TestDevice } from '@/test-utils/sync-device';

jest.setTimeout(60_000);

let server: TestServer;
const cleanup: (() => Promise<void>)[] = [];

beforeAll(async () => {
  server = await createTestServer();
});

afterAll(async () => {
  await server.close();
});

afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});

const defaults = DEFAULT_CATEGORIES.map((category) => ({ ...category, name: category.key }));

/** Espaço sem conta com dados da Fase 1: duas contas, uma categoria própria e movimentos. */
async function anonymousSpace(): Promise<LocalStore> {
  const db = await openTestDatabase();
  const store = createLocalStore(db, { newId: testId });
  cleanup.push(() => db.close());
  await attachSpace(store, ANONYMOUS_SPACE);
  const repos = store.repositories;
  await repos.categories.seedDefaults(defaults);
  const bank = await repos.accounts.create({
    name: 'Banco',
    type: 'bank',
    currency: 'EUR',
    initialBalance: 50000,
  });
  const cash = await repos.accounts.create({
    name: 'Carteira',
    type: 'cash',
    currency: 'EUR',
    initialBalance: 2000,
  });
  const gym = await repos.categories.create({
    name: 'Ginásio',
    type: 'expense',
    icon: 'barbell-outline',
    color: 'red',
  });
  const base = { destinationAccountId: null, date: '2026-11-01', description: '', notes: '' };
  await repos.entries.create({
    ...base,
    type: 'expense',
    amount: 3500,
    accountId: bank.id,
    categoryId: gym.id,
  });
  await repos.entries.create({
    ...base,
    type: 'expense',
    amount: 1250,
    accountId: cash.id,
    categoryId: DEFAULT_CATEGORIES[2]!.id,
  });
  await repos.entries.create({
    ...base,
    type: 'transfer',
    amount: 1000,
    accountId: bank.id,
    categoryId: null,
    destinationAccountId: cash.id,
  });
  return store;
}

async function accountDevice(session: ServerSession): Promise<TestDevice> {
  const device = await createTestDevice(session, { seed: true });
  cleanup.push(() => device.close());
  return device;
}

async function serverLive(session: ServerSession, table: string): Promise<number> {
  const [row] = await session.query<{ n: number }>(
    `select count(*)::int as n from public.${table} where deleted_at is null`,
  );
  return row!.n;
}

async function totals(store: LocalStore) {
  const accounts = await store.repositories.accounts.listWithBalances();
  return {
    accounts: accounts.length,
    entries: (await store.repositories.entries.list()).total,
    balance: accounts.reduce((sum, account) => sum + account.balance, 0),
  };
}

describe('import of data created without an account', () => {
  it('copies, uploads, verifies and only then clears the anonymous copy', async () => {
    const user = await server.createUser(randomUUID());
    const anonymous = await anonymousSpace();
    const account = await accountDevice(user);
    const before = await totals(anonymous);

    expect(await shouldOfferImport(anonymous, account)).toBe(true);
    const result = await runImport({
      anonymous,
      account,
      engine: account.engine,
      transport: account.transport,
    });
    expect(result).toEqual({ status: 'confirmed', imported: 6 });
    expect(await totals(account)).toEqual(before);
    expect(await serverLive(user, 'accounts')).toBe(2);
    expect(await serverLive(user, 'entries')).toBe(3);
    expect(await serverLive(user, 'categories')).toBe(16);
    expect(await totals(anonymous)).toEqual({ accounts: 0, entries: 0, balance: 0 });
    // As categorias base continuam disponíveis no uso sem conta.
    expect((await anonymous.repositories.categories.list()).length).toBe(15);
    expect(await shouldOfferImport(anonymous, account)).toBe(false);
  });

  it('keeps everything local while offline and resumes without duplicates', async () => {
    const user = await server.createUser(randomUUID());
    const anonymous = await anonymousSpace();
    const account = await accountDevice(user);
    account.transport.online = false;

    const first = await runImport({
      anonymous,
      account,
      engine: account.engine,
      transport: account.transport,
    });
    expect(first).toMatchObject({ status: 'pending', imported: 6 });
    // Nada é apagado antes da confirmação.
    expect((await totals(anonymous)).entries).toBe(3);

    // Resposta perdida a meio: o servidor aplicou, o cliente não soube.
    account.transport.online = true;
    account.transport.dropNextPushResponse = true;
    const second = await runImport({
      anonymous,
      account,
      engine: account.engine,
      transport: account.transport,
    });
    expect(second.status).toBe('pending');
    expect((await totals(anonymous)).entries).toBe(3);

    const third = await runImport({
      anonymous,
      account,
      engine: account.engine,
      transport: account.transport,
    });
    expect(third).toEqual({ status: 'confirmed', imported: 6 });
    expect(await serverLive(user, 'entries')).toBe(3);
    expect(await serverLive(user, 'accounts')).toBe(2);
    expect((await totals(account)).entries).toBe(3);
  });

  it('can be cancelled before confirmation without touching the anonymous data', async () => {
    const user = await server.createUser(randomUUID());
    const anonymous = await anonymousSpace();
    const account = await accountDevice(user);
    account.transport.online = false;
    await runImport({ anonymous, account, engine: account.engine, transport: account.transport });

    expect(await cancelImport(account)).toBe(true);
    expect(await totals(account)).toEqual({ accounts: 0, entries: 0, balance: 0 });
    expect((await totals(anonymous)).entries).toBe(3);
    expect(await getImportState(account)).toEqual({ state: 'declined' });

    account.transport.online = true;
    expect(await account.engine.sync()).toMatchObject({ pending: 0, conflicts: 0 });
    expect(await serverLive(user, 'entries')).toBe(0);
    expect(await serverLive(user, 'categories')).toBe(15);
  });

  it('never opens one account space for another account or for anonymous use', async () => {
    const db = await openTestDatabase();
    cleanup.push(() => db.close());
    const store = createLocalStore(db, { newId: testId });
    const owner = randomUUID();
    await attachSpace(store, { kind: 'user', userId: owner });
    await attachSpace(store, { kind: 'user', userId: owner });
    await expect(attachSpace(store, { kind: 'user', userId: randomUUID() })).rejects.toEqual(
      new DatabaseUnavailableError('wrongOwner'),
    );
    await expect(attachSpace(store, ANONYMOUS_SPACE)).rejects.toBeInstanceOf(
      DatabaseUnavailableError,
    );
  });
});
