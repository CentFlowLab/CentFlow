/**
 * @jest-environment node
 */
import {
  createTestServer,
  type ServerSession,
  type TestServer,
} from '@/test-utils/supabase-server';

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const ACCOUNT = '10000000-0000-4000-8000-000000000001';
const ACCOUNT_2 = '10000000-0000-4000-8000-000000000002';
const ACCOUNT_USD = '10000000-0000-4000-8000-000000000003';
const GROCERIES = '20000000-0000-4000-8000-000000000001';
const SALARY = '20000000-0000-4000-8000-000000000002';
const ENTRY = '30000000-0000-4000-8000-000000000001';

type OpResult = {
  op_id: string;
  status: 'applied' | 'duplicate' | 'conflict' | 'rejected' | 'aborted';
  reason?: string;
  row?: Record<string, unknown> | null;
};
type PushResponse = { results: OpResult[] };

let opCounter = 0;
function opId(): string {
  opCounter += 1;
  return `40000000-0000-4000-8000-${String(opCounter).padStart(12, '0')}`;
}

type Op = {
  op_id: string;
  tx_id: string | null;
  entity: 'accounts' | 'categories' | 'entries';
  record_id: string;
  base_version: number;
  data: Record<string, unknown>;
};

function accountOp(id: string, base: number, data: Partial<Record<string, unknown>> = {}): Op {
  return {
    op_id: opId(),
    tx_id: null,
    entity: 'accounts',
    record_id: id,
    base_version: base,
    data: {
      name: 'Banco',
      type: 'bank',
      currency: 'EUR',
      initial_balance: 100000,
      archived_at: null,
      deleted_at: null,
      created_at: '2026-11-01T10:00:00.000Z',
      ...data,
    },
  };
}

function categoryOp(id: string, base: number, data: Partial<Record<string, unknown>> = {}): Op {
  return {
    op_id: opId(),
    tx_id: null,
    entity: 'categories',
    record_id: id,
    base_version: base,
    data: {
      name: 'Supermercado',
      type: 'expense',
      icon: 'cart-outline',
      color: 'green',
      system_key: 'groceries',
      deleted_at: null,
      ...data,
    },
  };
}

function entryOp(id: string, base: number, data: Partial<Record<string, unknown>> = {}): Op {
  return {
    op_id: opId(),
    tx_id: null,
    entity: 'entries',
    record_id: id,
    base_version: base,
    data: {
      type: 'expense',
      amount: 4230,
      description: 'Compras',
      notes: null,
      category_id: GROCERIES,
      account_id: ACCOUNT,
      destination_account_id: null,
      date: '2026-11-08',
      deleted_at: null,
      ...data,
    },
  };
}

async function push(session: ServerSession, ops: Op[]): Promise<OpResult[]> {
  return (await session.rpc<PushResponse>('sync_push', { p_ops: ops })).results;
}

async function seedBasics(session: ServerSession): Promise<void> {
  const results = await push(session, [accountOp(ACCOUNT, 0), categoryOp(GROCERIES, 0)]);
  expect(results.map((r) => r.status)).toEqual(['applied', 'applied']);
}

let server: TestServer;
let alice: ServerSession;
let bob: ServerSession;

beforeEach(async () => {
  server = await createTestServer();
  alice = await server.createUser(A);
  bob = await server.createUser(B);
});

afterEach(async () => {
  await server.close();
});

describe('schema', () => {
  it('enables row level security on every table with personal data', async () => {
    const rows = await server.pg.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class
        where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname`,
    );
    expect(rows).toEqual(
      ['accounts', 'categories', 'entries', 'profiles', 'sync_metadata'].map((relname) => ({
        relname,
        relrowsecurity: true,
      })),
    );
  });

  it('stores money as bigint', async () => {
    const rows = await server.pg.query<{
      table_name: string;
      column_name: string;
      data_type: string;
    }>(
      `select table_name, column_name, data_type from information_schema.columns
        where table_schema = 'public' and column_name in ('amount', 'initial_balance')
        order by table_name`,
    );
    expect(rows).toEqual([
      { table_name: 'accounts', column_name: 'initial_balance', data_type: 'bigint' },
      { table_name: 'entries', column_name: 'amount', data_type: 'bigint' },
    ]);
  });

  it('creates the profile and sync metadata when a user signs up', async () => {
    expect(await alice.query('select id from public.profiles')).toEqual([{ id: A }]);
    expect(await alice.query('select user_id, last_seq from public.sync_metadata')).toEqual([
      { user_id: A, last_seq: 0 },
    ]);
  });
});

describe('row level security', () => {
  beforeEach(async () => {
    await seedBasics(alice);
    expect((await push(alice, [entryOp(ENTRY, 0)]))[0]!.status).toBe('applied');
  });

  it('lets a user read their own rows', async () => {
    expect(await alice.query('select id from public.entries')).toEqual([{ id: ENTRY }]);
  });

  it('hides other users rows from select', async () => {
    for (const table of ['accounts', 'categories', 'entries', 'profiles', 'sync_metadata']) {
      const rows = await bob.query(
        `select * from public.${table} where ${table === 'profiles' ? 'id' : 'user_id'} = $1`,
        [A],
      );
      expect(rows).toEqual([]);
    }
  });

  it('prevents updating another users rows', async () => {
    const updated = await bob.query(
      `update public.entries set amount = 1, version = version where user_id = $1 returning id`,
      [A],
    );
    expect(updated).toEqual([]);
    expect(await alice.query('select amount from public.entries')).toEqual([{ amount: 4230 }]);
  });

  it('prevents inserting rows on behalf of another user', async () => {
    await expect(
      bob.query(
        `insert into public.accounts (user_id, id, name, type, currency)
         values ($1, $2, 'Roubo', 'bank', 'EUR')`,
        [A, ACCOUNT_2],
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('prevents referencing another users account or category', async () => {
    await push(bob, [categoryOp(GROCERIES, 0)]);
    const [result] = await push(bob, [entryOp(ENTRY, 0)]);
    // A conta ACCOUNT só existe para a Alice: a chave estrangeira (user_id, account_id) falha.
    expect(result).toMatchObject({ status: 'rejected' });
    expect(await bob.query('select id from public.entries')).toEqual([]);
  });

  it('applies sync operations only to the callers own rows', async () => {
    const [result] = await push(bob, [entryOp(ENTRY, 1, { amount: 1 })]);
    expect(result).toMatchObject({ status: 'conflict', reason: 'missing' });
    expect(await alice.query('select amount from public.entries')).toEqual([{ amount: 4230 }]);
  });

  it('denies hard deletes to clients', async () => {
    await expect(alice.query('delete from public.entries')).rejects.toThrow(/permission denied/);
  });

  it('denies everything to anonymous requests', async () => {
    const anon = server.anonymous();
    await expect(anon.query('select * from public.entries')).rejects.toThrow(/permission denied/);
    await expect(anon.query(`select public.sync_pull(0, 10)`)).rejects.toThrow(/permission denied/);
  });

  it('does not let clients change their sync metadata or purge data', async () => {
    await expect(
      alice.query('update public.sync_metadata set purged_through_seq = 0'),
    ).rejects.toThrow(/permission denied/);
    await expect(alice.query(`select public.purge_deleted()`)).rejects.toThrow(/permission denied/);
  });

  it('removes personal data when the auth user is deleted', async () => {
    await server.pg.query('delete from auth.users where id = $1', [A]);
    expect(await server.pg.query('select id from public.profiles where id = $1', [A])).toEqual([]);
    expect(await server.pg.query('select id from public.accounts where user_id = $1', [A])).toEqual(
      [],
    );
    expect(await server.pg.query('select id from public.entries where user_id = $1', [A])).toEqual(
      [],
    );
    expect(await server.pg.query('select id from public.profiles where id = $1', [B])).toEqual([
      { id: B },
    ]);
  });

  it('only lets users edit their own display name', async () => {
    await alice.query(`update public.profiles set display_name = 'Alice'`);
    expect(await alice.query('select display_name from public.profiles')).toEqual([
      { display_name: 'Alice' },
    ]);
    await expect(alice.query(`update public.profiles set id = $1`, [B])).rejects.toThrow(
      /permission denied/,
    );
    expect(await bob.query('select display_name from public.profiles')).toEqual([
      { display_name: null },
    ]);
  });
});

describe('versions and idempotency', () => {
  beforeEach(async () => {
    await seedBasics(alice);
  });

  it('assigns versions and increasing sequence numbers on the server', async () => {
    const [created] = await push(alice, [entryOp(ENTRY, 0)]);
    const [edited] = await push(alice, [entryOp(ENTRY, 1, { amount: 5000 })]);
    expect(created!.row).toMatchObject({ version: 1, amount: 4230 });
    expect(edited!.row).toMatchObject({ version: 2, amount: 5000 });
    expect(Number(edited!.row!.server_seq)).toBeGreaterThan(Number(created!.row!.server_seq));
  });

  it('treats a repeated operation as already applied', async () => {
    const op = entryOp(ENTRY, 0);
    expect((await push(alice, [op]))[0]!.status).toBe('applied');
    expect((await push(alice, [op]))[0]!.status).toBe('duplicate');
    const edit = entryOp(ENTRY, 1, { amount: 6000 });
    await push(alice, [edit]);
    expect((await push(alice, [edit]))[0]).toMatchObject({ status: 'duplicate' });
    expect(await alice.query('select amount, version from public.entries')).toEqual([
      { amount: 6000, version: 2 },
    ]);
  });

  it('reports a conflict when two devices edit the same version', async () => {
    await push(alice, [entryOp(ENTRY, 0)]);
    const [first] = await push(alice, [entryOp(ENTRY, 1, { amount: 6000 })]);
    const [second] = await push(alice, [entryOp(ENTRY, 1, { amount: 4500 })]);
    expect(first!.status).toBe('applied');
    expect(second).toMatchObject({ status: 'conflict', reason: 'version' });
    expect(second!.row).toMatchObject({ amount: 6000, version: 2 });
    expect(await alice.query('select amount from public.entries')).toEqual([{ amount: 6000 }]);
  });

  it('enforces compare-and-swap on direct table updates too', async () => {
    await push(alice, [entryOp(ENTRY, 0)]);
    await expect(alice.query('update public.entries set amount = 1, version = 7')).rejects.toThrow(
      /version_conflict/,
    );
  });

  it('never recreates a missing row from an edit', async () => {
    const [result] = await push(alice, [entryOp(ENTRY, 3)]);
    expect(result).toMatchObject({ status: 'conflict', reason: 'missing', row: null });
    expect(await alice.query('select id from public.entries')).toEqual([]);
  });

  it('rolls back a whole transaction group when one operation conflicts', async () => {
    await push(alice, [entryOp(ENTRY, 0)]);
    const tx = 'tx-1';
    const results = await push(alice, [
      { ...accountOp(ACCOUNT_2, 0, { name: 'Poupança' }), tx_id: tx },
      { ...entryOp(ENTRY, 0), tx_id: tx },
    ]);
    expect(results.map((r) => r.status)).toEqual(['aborted', 'conflict']);
    expect(await alice.query('select id from public.accounts where id = $1', [ACCOUNT_2])).toEqual(
      [],
    );
  });

  it('keeps applying later groups after a failed one', async () => {
    const results = await push(alice, [
      entryOp(ENTRY, 0, { amount: -5 }),
      accountOp(ACCOUNT_2, 0, { name: 'Poupança' }),
    ]);
    expect(results.map((r) => r.status)).toEqual(['rejected', 'applied']);
  });
});

describe('financial integrity on the server', () => {
  beforeEach(async () => {
    await seedBasics(alice);
    await push(alice, [
      categoryOp(SALARY, 0, { name: 'Salário', type: 'income', system_key: 'salary' }),
      accountOp(ACCOUNT_USD, 0, { name: 'USD', currency: 'USD' }),
    ]);
  });

  it.each([
    ['negative amount', { amount: -100 }],
    ['zero amount', { amount: 0 }],
    ['decimal amount', { amount: '42.30' }],
    ['category of the wrong type', { category_id: SALARY }],
    ['transfer with a category', { type: 'transfer', destination_account_id: ACCOUNT_USD }],
    [
      'transfer between currencies',
      { type: 'transfer', category_id: null, destination_account_id: ACCOUNT_USD },
    ],
    [
      'transfer to the same account',
      { type: 'transfer', category_id: null, destination_account_id: ACCOUNT },
    ],
    ['unknown account', { account_id: ACCOUNT_2 }],
    ['invalid date', { date: '2026-02-30' }],
  ])('rejects %s', async (_, data) => {
    const [result] = await push(alice, [entryOp(ENTRY, 0, data)]);
    expect(result!.status).toBe('rejected');
    expect(await alice.query('select id from public.entries')).toEqual([]);
  });

  it('rejects deleting an account or category that still has entries', async () => {
    await push(alice, [entryOp(ENTRY, 0)]);
    const now = new Date().toISOString();
    const [account] = await push(alice, [accountOp(ACCOUNT, 1, { deleted_at: now })]);
    const [category] = await push(alice, [categoryOp(GROCERIES, 1, { deleted_at: now })]);
    expect(account).toMatchObject({ status: 'rejected', reason: 'account_in_use' });
    expect(category).toMatchObject({ status: 'rejected', reason: 'category_in_use' });
  });

  it('accepts deleting an account together with its entries in one group', async () => {
    await push(alice, [entryOp(ENTRY, 0)]);
    const now = new Date().toISOString();
    const results = await push(alice, [
      { ...entryOp(ENTRY, 1, { deleted_at: now }), tx_id: 'tx-delete' },
      { ...accountOp(ACCOUNT, 1, { deleted_at: now }), tx_id: 'tx-delete' },
    ]);
    expect(results.map((r) => r.status)).toEqual(['applied', 'applied']);
  });

  it('locks the currency of an account with entries', async () => {
    await push(alice, [entryOp(ENTRY, 0)]);
    const [result] = await push(alice, [accountOp(ACCOUNT, 1, { currency: 'USD' })]);
    expect(result).toMatchObject({ status: 'rejected', reason: 'currency_locked' });
  });

  it('rejects new entries on a deleted account', async () => {
    await push(alice, [accountOp(ACCOUNT, 1, { deleted_at: new Date().toISOString() })]);
    const [result] = await push(alice, [entryOp(ENTRY, 0)]);
    expect(result).toMatchObject({ status: 'rejected', reason: 'account_unavailable' });
  });
});

describe('pull', () => {
  it('returns changes in commit order with paging', async () => {
    await seedBasics(alice);
    await push(alice, [entryOp(ENTRY, 0)]);
    await push(alice, [accountOp(ACCOUNT, 1, { name: 'Banco renomeado' })]);

    type Pull = {
      changes: { entity: string; server_seq: number; row: { id: string } }[];
      has_more: boolean;
      last_seq: number;
    };
    const first = await alice.rpc<Pull>('sync_pull', { p_since: 0, p_limit: 2 });
    expect(first.changes.map((c) => c.entity)).toEqual(['categories', 'entries']);
    expect(first.has_more).toBe(true);
    const since = first.changes[first.changes.length - 1]!.server_seq;
    const second = await alice.rpc<Pull>('sync_pull', { p_since: since, p_limit: 2 });
    expect(second.changes.map((c) => [c.entity, c.row.id])).toEqual([['accounts', ACCOUNT]]);
    expect(second.has_more).toBe(false);

    expect((await bob.rpc<Pull>('sync_pull', { p_since: 0 })).changes).toEqual([]);
  });

  it('confirms persisted records and counts', async () => {
    await seedBasics(alice);
    await push(alice, [entryOp(ENTRY, 0)]);
    const verified = await alice.rpc<{ entity: string; id: string; version: number }[]>(
      'sync_verify',
      {
        p_records: [
          { entity: 'entries', id: ENTRY },
          { entity: 'accounts', id: ACCOUNT_2 },
        ],
      },
    );
    expect(verified).toEqual([
      { entity: 'entries', id: ENTRY, version: 1, deleted: false },
      { entity: 'accounts', id: ACCOUNT_2, version: null, deleted: false },
    ]);
    expect(await alice.rpc('sync_counts', {})).toMatchObject({
      accounts: { live: 1, deleted: 0 },
      entries: { live: 1, deleted: 0 },
    });
    expect(await bob.rpc('sync_counts', {})).toMatchObject({ entries: { live: 0, deleted: 0 } });
  });
});

describe('purge of deleted rows', () => {
  it('purges only old tombstones and forces clients behind it to resync', async () => {
    await seedBasics(alice);
    await push(alice, [entryOp(ENTRY, 0)]);
    await push(alice, [entryOp(ENTRY, 1, { deleted_at: new Date().toISOString() })]);

    expect(await server.pg.query(`select public.purge_deleted()`)).toEqual([
      { purge_deleted: { entries: 0, categories: 0, accounts: 0 } },
    ]);

    await server.pg.query(
      `update public.entries set deleted_at = now() - interval '200 days', version = version`,
    );
    expect(await server.pg.query(`select public.purge_deleted()`)).toEqual([
      { purge_deleted: { entries: 1, categories: 0, accounts: 0 } },
    ]);
    await expect(server.pg.query(`select public.purge_deleted(interval '1 day')`)).rejects.toThrow(
      /retention_too_short/,
    );

    expect(await alice.rpc('sync_pull', { p_since: 1 })).toMatchObject({ reset_required: true });
    expect(await alice.rpc('sync_pull', { p_since: 0 })).toMatchObject({ reset_required: false });
    // A edição de um registo purgado nunca o recria.
    const [result] = await push(alice, [entryOp(ENTRY, 2, { amount: 1 })]);
    expect(result).toMatchObject({ status: 'conflict', reason: 'missing' });
  });
});
