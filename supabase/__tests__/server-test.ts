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
const BUDGET = '50000000-0000-4000-8000-000000000001';
const BUDGET_2 = '50000000-0000-4000-8000-000000000002';

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
  entity:
    | 'accounts'
    | 'categories'
    | 'budgets'
    | 'subscriptions'
    | 'goals'
    | 'goal_contributions'
    | 'wealth_items'
    | 'vehicles'
    | 'documents'
    | 'entries';
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

function budgetOp(id: string, base: number, data: Partial<Record<string, unknown>> = {}): Op {
  return {
    op_id: opId(),
    tx_id: null,
    entity: 'budgets',
    record_id: id,
    base_version: base,
    data: {
      category_id: GROCERIES,
      amount: 5000,
      currency: 'EUR',
      period: 'monthly',
      starts_on: '2026-11-01',
      deleted_at: null,
      created_at: '2026-11-01T10:00:00.000Z',
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

// No CI do macOS, arrancar o PGlite pode passar dos 5 s por omissão.
jest.setTimeout(30_000);

beforeEach(async () => {
  server = await createTestServer();
  alice = await server.createUser(A);
  bob = await server.createUser(B);
});

afterEach(async () => {
  await server?.close();
});

describe('schema', () => {
  it('enables row level security on every table with personal data', async () => {
    const rows = await server.pg.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class
        where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname`,
    );
    expect(rows).toEqual(
      [
        'accounts',
        'budgets',
        'categories',
        'documents',
        'entries',
        'goal_contributions',
        'goals',
        'login_attempts',
        'profiles',
        'subscriptions',
        'sync_metadata',
        'vehicles',
        'wealth_items',
      ].map((relname) => ({
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
        where table_schema = 'public'
          and column_name in ('amount', 'initial_balance', 'target_amount')
        order by table_name`,
    );
    expect(rows).toEqual([
      { table_name: 'accounts', column_name: 'initial_balance', data_type: 'bigint' },
      { table_name: 'budgets', column_name: 'amount', data_type: 'bigint' },
      { table_name: 'entries', column_name: 'amount', data_type: 'bigint' },
      { table_name: 'goal_contributions', column_name: 'amount', data_type: 'bigint' },
      { table_name: 'goals', column_name: 'target_amount', data_type: 'bigint' },
      { table_name: 'subscriptions', column_name: 'amount', data_type: 'bigint' },
      { table_name: 'wealth_items', column_name: 'amount', data_type: 'bigint' },
    ]);
  });

  it('creates the profile and sync metadata when a user signs up', async () => {
    expect(await alice.query('select id from public.profiles')).toEqual([{ id: A }]);
    expect(await alice.query('select user_id, last_seq from public.sync_metadata')).toEqual([
      { user_id: A, last_seq: 0 },
    ]);
  });

  it('keeps the username chosen at sign-up', async () => {
    const id = '00000000-0000-4000-8000-0000000000c1';
    await server.pg.query(
      `insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)`,
      [id, 'manu@example.test', JSON.stringify({ username: '  Manu  ' })],
    );
    expect(
      await server.pg.query('select display_name from public.profiles where id = $1', [id]),
    ).toEqual([{ display_name: 'Manu' }]);
  });

  it('tells sign-in whether an email has an account', async () => {
    const known = await server
      .anonymous()
      .query<{ registered: boolean }>('select public.email_registered($1) as registered', [
        `${A}@example.test`,
      ]);
    const missing = await server
      .anonymous()
      .query<{ registered: boolean }>('select public.email_registered($1) as registered', [
        'ninguem@example.test',
      ]);
    expect(known[0]?.registered).toBe(true);
    expect(missing[0]?.registered).toBe(false);
  });
});

describe('usernames', () => {
  let server: TestServer;
  const MANU = '00000000-0000-4000-8000-0000000000d1';

  beforeEach(async () => {
    server = await createTestServer();
    await server.pg.query(
      `insert into auth.users (id, email, encrypted_password, raw_user_meta_data)
       values ($1, $2, extensions.crypt('palavra-certa', extensions.gen_salt('bf')), $3::jsonb)`,
      [
        MANU,
        'manu@example.test',
        JSON.stringify({ username: ' Manu.Silva ', birth_date: '1995-04-12' }),
      ],
    );
  });

  afterEach(async () => {
    await server.close();
  });

  async function anon<T>(sql: string, params: unknown[]): Promise<T | undefined> {
    const rows = await server.anonymous().query<{ result: T }>(sql, params);
    return rows[0]?.result;
  }

  it('stores a lowercase username and the birth date from sign-up', async () => {
    expect(
      await server.pg.query(
        'select username, birth_date::text as birth from public.profiles where id = $1',
        [MANU],
      ),
    ).toEqual([{ username: 'manu.silva', birth: '1995-04-12' }]);
  });

  it('says whether a username is free, ignoring case', async () => {
    expect(await anon('select public.username_available($1) as result', ['MANU.silva'])).toBe(
      false,
    );
    expect(await anon('select public.username_available($1) as result', ['outra'])).toBe(true);
    expect(await anon('select public.username_available($1) as result', ['no'])).toBe(false);
  });

  it('refuses a second account with the same username', async () => {
    await expect(
      server.pg.query(
        `insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)`,
        [
          '00000000-0000-4000-8000-0000000000d2',
          'outra@example.test',
          JSON.stringify({ username: 'manu.silva' }),
        ],
      ),
    ).rejects.toThrow();
  });

  it('returns the email only with the right password', async () => {
    const sql = 'select public.login_email($1, $2) as result';
    expect(await anon(sql, ['Manu.Silva', 'palavra-certa'])).toBe('manu@example.test');
    expect(await anon(sql, ['manu.silva', 'errada'])).toBeNull();
    expect(await anon(sql, ['ninguem', 'palavra-certa'])).toBeNull();
  });

  it('locks a username after ten failed attempts', async () => {
    const sql = 'select public.login_email($1, $2) as result';
    for (let i = 0; i < 10; i += 1) {
      expect(await anon(sql, ['manu.silva', `errada-${i}`])).toBeNull();
    }
    await expect(anon(sql, ['manu.silva', 'palavra-certa'])).rejects.toThrow('rate_limited');
  });

  it('keeps the attempts table away from clients', async () => {
    await expect(server.anonymous().query('select * from public.login_attempts')).rejects.toThrow();
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
    for (const table of [
      'accounts',
      'budgets',
      'categories',
      'entries',
      'profiles',
      'sync_metadata',
    ]) {
      const rows = await bob.query(
        `select * from public.${table} where ${table === 'profiles' ? 'id' : 'user_id'} = $1`,
        [A],
      );
      expect(rows).toEqual([]);
    }
  });

  it('prevents updating another users rows', async () => {
    await expect(
      bob.query(`update public.entries set amount = 1 where user_id = $1`, [A]),
    ).rejects.toThrow(/permission denied/);
    expect(await alice.query('select amount from public.entries')).toEqual([{ amount: 4230 }]);
  });

  it('prevents inserting rows on behalf of another user', async () => {
    await expect(
      bob.query(
        `insert into public.accounts (user_id, id, name, type, currency)
         values ($1, $2, 'Roubo', 'bank', 'EUR')`,
        [A, ACCOUNT_2],
      ),
    ).rejects.toThrow(/permission denied/);
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

  it('refuses direct writes and hides sync_apply_op from the public schema', async () => {
    await push(alice, [entryOp(ENTRY, 0)]);
    await expect(alice.query('update public.entries set amount = 1')).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      alice.query(
        `insert into public.entries (id, type, amount, description, account_id, category_id, date)
         values ($1, 'expense', 1, '', $2, $3, '2026-11-01')`,
        ['30000000-0000-4000-8000-000000000099', ACCOUNT, GROCERIES],
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(alice.query(`select public.sync_apply_op('{}'::jsonb)`)).rejects.toThrow(
      /sync_apply_op/,
    );
    await expect(alice.query(`select sync_apply_op('{}'::jsonb)`)).rejects.toThrow(/sync_apply_op/);
    expect(
      await server.pg.query(
        `select n.nspname as schema
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where p.proname = 'sync_apply_op'`,
      ),
    ).toEqual([{ schema: 'private' }]);
    expect(await alice.query('select amount from public.entries')).toEqual([{ amount: 4230 }]);
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
    expect(result).not.toHaveProperty('code');
    expect(JSON.stringify(result)).not.toMatch(/constraint|42\.30|violates/i);
    expect(await alice.query('select id from public.entries')).toEqual([]);
  });

  it('hides the rejected literal from the public error', async () => {
    const [result] = await push(alice, [entryOp(ENTRY, 0, { amount: '42.30' })]);
    expect(result).toMatchObject({ status: 'rejected', reason: 'invalid' });
    expect(JSON.stringify(result)).not.toContain('42.30');
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
      {
        purge_deleted: {
          entries: 0,
          budgets: 0,
          subscriptions: 0,
          goal_contributions: 0,
          goals: 0,
          wealth_items: 0,
          vehicles: 0,
          documents: 0,
          categories: 0,
          accounts: 0,
        },
      },
    ]);

    await server.pg.query(
      `update public.entries set deleted_at = now() - interval '200 days', version = version`,
    );
    expect(await server.pg.query(`select public.purge_deleted()`)).toEqual([
      {
        purge_deleted: {
          entries: 1,
          budgets: 0,
          subscriptions: 0,
          goal_contributions: 0,
          goals: 0,
          wealth_items: 0,
          vehicles: 0,
          documents: 0,
          categories: 0,
          accounts: 0,
        },
      },
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

  it('rejects purge_deleted for an authenticated caller even if execute was granted', async () => {
    await expect(alice.query('select public.purge_deleted()')).rejects.toThrow(/permission denied/);
    await server.pg.query(
      'grant execute on function public.purge_deleted(interval) to authenticated',
    );
    await expect(alice.query('select public.purge_deleted()')).rejects.toThrow(/not_authorized/);
    await server.pg.query(
      'revoke execute on function public.purge_deleted(interval) from authenticated',
    );
  });
});

describe('budgets', () => {
  beforeEach(() => seedBasics(alice));

  it('creates, updates and soft-deletes without touching entries', async () => {
    await push(alice, [entryOp(ENTRY, 0)]);
    const created = budgetOp(BUDGET, 0);
    expect((await push(alice, [created]))[0]).toMatchObject({ status: 'applied' });
    expect((await push(alice, [created]))[0]).toMatchObject({ status: 'duplicate' });
    expect((await push(alice, [budgetOp(BUDGET, 1, { amount: 8000 })]))[0]).toMatchObject({
      status: 'applied',
    });
    const [stale] = await push(alice, [budgetOp(BUDGET, 1, { amount: 1000 })]);
    expect(stale).toMatchObject({ status: 'conflict', reason: 'version' });
    const [removed] = await push(alice, [
      budgetOp(BUDGET, 2, { amount: 8000, deleted_at: new Date().toISOString() }),
    ]);
    expect(removed).toMatchObject({ status: 'applied' });
    expect(await alice.query('select id, amount from public.entries')).toEqual([
      { id: ENTRY, amount: 4230 },
    ]);
    expect(await alice.query('select deleted_at is not null as gone from public.budgets')).toEqual([
      { gone: true },
    ]);
  });

  it('rejects a second active budget for the same category and an income category', async () => {
    await push(alice, [budgetOp(BUDGET, 0)]);
    const [duplicate] = await push(alice, [budgetOp(BUDGET_2, 0)]);
    expect(duplicate).toMatchObject({ status: 'rejected', reason: 'duplicate_budget' });
    await push(alice, [
      categoryOp(SALARY, 0, { name: 'Salário', type: 'income', system_key: null }),
    ]);
    const [income] = await push(alice, [budgetOp(BUDGET_2, 0, { category_id: SALARY })]);
    expect(income).toMatchObject({ status: 'rejected', reason: 'category_type_mismatch' });
  });

  it('isolates budgets per user and keeps the old pull free of them', async () => {
    await push(alice, [budgetOp(BUDGET, 0)]);
    expect(await bob.query('select id from public.budgets')).toEqual([]);
    await expect(
      bob.query(`update public.budgets set amount = 1 where user_id = $1`, [A]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      alice.query(
        `insert into public.budgets (user_id, id, category_id, amount, currency, period, starts_on)
         values ($1, $2, $3, 100, 'EUR', 'monthly', '2026-11-01')`,
        [A, BUDGET_2, GROCERIES],
      ),
    ).rejects.toThrow(/permission denied/);

    type Pull = { changes: { entity: string }[] };
    const legacy = await alice.rpc<Pull>('sync_pull', { p_since: 0 });
    expect(legacy.changes.map((change) => change.entity)).not.toContain('budgets');
    const current = await alice.rpc<Pull>('sync_pull_v2', { p_since: 0 });
    expect(current.changes.map((change) => change.entity)).toContain('budgets');
    expect((await bob.rpc<Pull>('sync_pull_v2', { p_since: 0 })).changes).toEqual([]);
    await expect(server.anonymous().query('select * from public.budgets')).rejects.toThrow(
      /permission denied/,
    );
  });

  it('closes the active budget when an older app deletes the category', async () => {
    await push(alice, [categoryOp(SALARY, 0, { name: 'Casa', system_key: null })]);
    await push(alice, [entryOp(ENTRY, 0, { category_id: SALARY })]);
    await push(alice, [budgetOp(BUDGET, 0)]);
    const [before] = await alice.query<{ last_seq: number }>(
      'select last_seq::int as last_seq from public.sync_metadata',
    );
    const removal = categoryOp(GROCERIES, 1, { deleted_at: '2026-11-08T12:00:00.000Z' });
    const [removed] = await push(alice, [removal]);
    expect(removed).toMatchObject({ status: 'applied' });

    const [budget] = await alice.query<{
      version: number;
      server_seq: number;
      gone: boolean;
      same: boolean;
    }>(
      `select version::int, server_seq::int, deleted_at is not null as gone,
              deleted_at = '2026-11-08T12:00:00.000Z'::timestamptz as same
         from public.budgets where id = $1`,
      [BUDGET],
    );
    const [category] = await alice.query<{ version: number; server_seq: number }>(
      'select version::int, server_seq::int from public.categories where id = $1',
      [GROCERIES],
    );
    const [meta] = await alice.query<{ last_seq: number }>(
      'select last_seq::int as last_seq from public.sync_metadata',
    );
    expect(budget).toMatchObject({ version: 2, gone: true, same: true });
    expect(budget!.server_seq).toBeGreaterThan(before!.last_seq);
    expect(budget!.server_seq).toBe(category!.server_seq + 1);
    expect(meta!.last_seq).toBe(budget!.server_seq);
    expect(await alice.query('select id, amount, category_id from public.entries')).toEqual([
      { id: ENTRY, amount: 4230, category_id: SALARY },
    ]);

    type Pull = {
      changes: { entity: string; server_seq: number; row: { deleted_at: string | null } }[];
    };
    const page = await alice.rpc<Pull>('sync_pull_v2', { p_since: category!.server_seq - 1 });
    const budgetChange = page.changes.find((change) => change.entity === 'budgets');
    expect(budgetChange?.server_seq).toBe(budget!.server_seq);
    expect(budgetChange?.row.deleted_at).toEqual(expect.any(String));

    expect((await push(alice, [removal]))[0]).toMatchObject({ status: 'duplicate' });
    expect(
      await alice.query<{ version: number }>(
        'select version::int from public.budgets where id = $1',
        [BUDGET],
      ),
    ).toEqual([{ version: 2 }]);
    const [again] = await push(alice, [
      categoryOp(GROCERIES, 2, { deleted_at: '2026-11-08T13:00:00.000Z' }),
    ]);
    expect(again).toMatchObject({ status: 'applied' });
    expect(
      await alice.query<{ version: number; n: number }>(
        `select version::int, count(*)::int as n from public.budgets group by version`,
      ),
    ).toEqual([{ version: 2, n: 1 }]);
  });

  it('leaves a category without a budget, and one that still has entries', async () => {
    const [removed] = await push(alice, [
      categoryOp(GROCERIES, 1, { deleted_at: '2026-11-08T12:00:00.000Z' }),
    ]);
    expect(removed).toMatchObject({ status: 'applied' });
    expect(await alice.query('select id from public.budgets')).toEqual([]);

    await push(alice, [categoryOp(SALARY, 0, { name: 'Casa', system_key: null })]);
    await push(alice, [budgetOp(BUDGET, 0, { category_id: SALARY })]);
    await push(alice, [entryOp(ENTRY, 0, { category_id: SALARY })]);
    const [blocked] = await push(alice, [
      categoryOp(SALARY, 1, {
        name: 'Casa',
        system_key: null,
        deleted_at: '2026-11-08T12:00:00.000Z',
      }),
    ]);
    expect(blocked).toMatchObject({ status: 'rejected', reason: 'category_in_use' });
    expect(
      await alice.query<{ gone: boolean; version: number }>(
        'select deleted_at is not null as gone, version::int from public.budgets',
      ),
    ).toEqual([{ gone: false, version: 1 }]);
    expect(await alice.query('select count(*)::int as n from public.entries')).toEqual([{ n: 1 }]);
  });

  it('does not tombstone a budget twice or lose a compare-and-swap', async () => {
    await push(alice, [budgetOp(BUDGET, 0)]);
    const [first] = await push(alice, [
      budgetOp(BUDGET, 1, { deleted_at: '2026-11-08T11:00:00.000Z' }),
    ]);
    expect(first).toMatchObject({ status: 'applied' });
    const [removed] = await push(alice, [
      categoryOp(GROCERIES, 1, { deleted_at: '2026-11-08T12:00:00.000Z' }),
    ]);
    expect(removed).toMatchObject({ status: 'applied' });
    expect(
      await alice.query(
        `select version::int as version,
                deleted_at = '2026-11-08T11:00:00.000Z'::timestamptz as same
           from public.budgets`,
      ),
    ).toEqual([{ version: 2, same: true }]);

    await push(alice, [categoryOp(SALARY, 0, { name: 'Casa', system_key: null })]);
    await push(alice, [budgetOp(BUDGET_2, 0, { category_id: SALARY, amount: 8000 })]);
    await push(alice, [
      categoryOp(SALARY, 1, {
        name: 'Casa',
        system_key: null,
        deleted_at: '2026-11-08T12:00:00.000Z',
      }),
    ]);
    const [stale] = await push(alice, [
      budgetOp(BUDGET_2, 1, { category_id: SALARY, amount: 1000 }),
    ]);
    expect(stale).toMatchObject({ status: 'conflict', reason: 'version' });
    expect(
      await alice.query<{ version: number; gone: boolean; n: number }>(
        `select version::int as version, deleted_at is not null as gone, count(*)::int as n
           from public.budgets where id = $1
          group by version, deleted_at is not null`,
        [BUDGET_2],
      ),
    ).toEqual([{ version: 2, gone: true, n: 1 }]);
    const [revive] = await push(alice, [
      budgetOp(BUDGET_2, 2, { category_id: SALARY, amount: 1000 }),
    ]);
    expect(revive).toMatchObject({ status: 'rejected', reason: 'category_unavailable' });
    expect(
      await alice.query('select count(*)::int as n from public.budgets where id = $1', [BUDGET_2]),
    ).toEqual([{ n: 1 }]);
  });
});

describe('subscriptions', () => {
  const SUB = '60000000-0000-4000-8000-000000000001';

  function subscriptionOp(data: Record<string, unknown> = {}) {
    return {
      op_id: opId(),
      tx_id: null,
      entity: 'subscriptions' as const,
      record_id: SUB,
      base_version: 0,
      data: {
        name: 'Telefone',
        amount: 1500,
        currency: 'EUR',
        period: 'monthly',
        status: 'active',
        starts_on: '2026-11-01',
        next_on: '2026-12-01',
        category_id: null,
        deleted_at: null,
        ...data,
      },
    };
  }

  it('syncs a recurring expense without creating an entry and hides it from the other user', async () => {
    const [created] = await push(alice, [subscriptionOp()]);
    expect(created).toMatchObject({ status: 'applied' });
    expect(await alice.query('select count(*)::int as n from public.entries')).toEqual([{ n: 0 }]);
    expect(await bob.query('select id from public.subscriptions')).toEqual([]);

    const [updated] = await push(alice, [
      { ...subscriptionOp({ status: 'paused' }), base_version: 1, op_id: opId() },
    ]);
    expect(updated).toMatchObject({ status: 'applied' });
    expect(
      await alice.query<{ status: string }>('select status from public.subscriptions'),
    ).toEqual([{ status: 'paused' }]);

    type Pull = { changes: { entity: string }[] };
    const fresh = await alice.rpc<Pull>('sync_pull_v2', { p_since: 0 });
    expect(fresh.changes.some((change) => change.entity === 'subscriptions')).toBe(true);
    const legacy = await alice.rpc<Pull>('sync_pull', { p_since: 0 });
    expect(legacy.changes.some((change) => change.entity === 'subscriptions')).toBe(false);
    expect((await bob.rpc<Pull>('sync_pull_v2', { p_since: 0 })).changes).toEqual([]);

    await expect(
      alice.query(`insert into public.subscriptions (id, name) values ('${SUB}', 'x')`),
    ).rejects.toThrow();
  });

  it('keeps the previous price, also when an older app updates without it', async () => {
    await push(alice, [subscriptionOp()]);
    await push(alice, [
      {
        ...subscriptionOp({ amount: 1800, previous_amount: 1500, amount_changed_on: '2026-11-11' }),
        base_version: 1,
        op_id: opId(),
      },
    ]);
    // Uma app sem os campos novos (0.1.7) muda só o nome: o preço anterior fica.
    await push(alice, [
      { ...subscriptionOp({ amount: 1800, name: 'Telemóvel' }), base_version: 2, op_id: opId() },
    ]);
    expect(
      await alice.query(
        'select name, amount, previous_amount, amount_changed_on::text as changed from public.subscriptions',
      ),
    ).toEqual([{ name: 'Telemóvel', amount: 1800, previous_amount: 1500, changed: '2026-11-11' }]);
  });

  it('rejects an income category and a next date before the start', async () => {
    await seedBasics(alice);
    await push(alice, [
      categoryOp(SALARY, 0, { name: 'Salário', type: 'income', system_key: null }),
    ]);
    const [income] = await push(alice, [subscriptionOp({ category_id: SALARY })]);
    expect(income).toMatchObject({ status: 'rejected', reason: 'category_type_mismatch' });
    const [dates] = await push(alice, [
      subscriptionOp({ next_on: '2026-10-01', category_id: null }),
    ]);
    expect(dates).toMatchObject({ status: 'rejected', reason: 'invalid' });
  });
});

describe('savings goals', () => {
  const GOAL = '70000000-0000-4000-8000-000000000001';
  const CONTRIBUTION = '70000000-0000-4000-8000-000000000002';

  function goalOp(base: number, data: Record<string, unknown> = {}) {
    return {
      op_id: opId(),
      tx_id: null,
      entity: 'goals' as const,
      record_id: GOAL,
      base_version: base,
      data: {
        name: 'Férias',
        target_amount: 10000,
        currency: 'EUR',
        target_on: '2026-12-01',
        deleted_at: null,
        ...data,
      },
    };
  }

  function contributionOp(base: number, data: Record<string, unknown> = {}) {
    return {
      op_id: opId(),
      tx_id: null,
      entity: 'goal_contributions' as const,
      record_id: CONTRIBUTION,
      base_version: base,
      data: {
        goal_id: GOAL,
        amount: 2500,
        date: '2026-11-08',
        deleted_at: null,
        ...data,
      },
    };
  }

  it('keeps each contribution as its own row and does not create an entry', async () => {
    const [goal] = await push(alice, [goalOp(0)]);
    expect(goal).toMatchObject({ status: 'applied' });
    const [contribution] = await push(alice, [contributionOp(0)]);
    expect(contribution).toMatchObject({ status: 'applied' });
    expect(await alice.query('select count(*)::int as n from public.entries')).toEqual([{ n: 0 }]);
    expect(
      await alice.query<{ saved: string | null }>(
        `select column_name as saved from information_schema.columns
          where table_schema = 'public' and table_name = 'goals'
            and column_name in ('saved_amount', 'progress', 'total')`,
      ),
    ).toEqual([]);
    expect(await bob.query('select id from public.goals')).toEqual([]);
    expect(await bob.query('select id from public.goal_contributions')).toEqual([]);

    type Pull = { changes: { entity: string }[] };
    const fresh = await alice.rpc<Pull>('sync_pull_v2', { p_since: 0 });
    expect(fresh.changes.some((change) => change.entity === 'goals')).toBe(true);
    expect(fresh.changes.some((change) => change.entity === 'goal_contributions')).toBe(true);
    const legacy = await alice.rpc<Pull>('sync_pull', { p_since: 0 });
    expect(legacy.changes.some((change) => change.entity === 'goals')).toBe(false);
    expect(legacy.changes.some((change) => change.entity === 'goal_contributions')).toBe(false);

    await expect(
      alice.query(`insert into public.goals (id, name) values ('${GOAL}', 'x')`),
    ).rejects.toThrow();
  });

  it('closes contributions when the goal is deleted and locks the currency', async () => {
    await push(alice, [goalOp(0), contributionOp(0)]);
    const [currency] = await push(alice, [goalOp(1, { currency: 'USD' })]);
    expect(currency).toMatchObject({ status: 'rejected', reason: 'currency_locked' });

    const [removed] = await push(alice, [goalOp(1, { deleted_at: new Date().toISOString() })]);
    expect(removed).toMatchObject({ status: 'applied' });
    expect(
      await alice.query<{ gone: boolean }>(
        `select deleted_at is not null as gone from public.goal_contributions where id = $1`,
        [CONTRIBUTION],
      ),
    ).toEqual([{ gone: true }]);
    expect(await alice.query('select count(*)::int as n from public.entries')).toEqual([{ n: 0 }]);

    const [missing] = await push(bob, [contributionOp(0)]);
    expect(missing).toMatchObject({ status: 'rejected', reason: 'goal_unavailable' });
  });
});

describe('wealth items', () => {
  const ITEM = '80000000-0000-4000-8000-000000000001';

  function itemOp(base: number, data: Record<string, unknown> = {}) {
    return {
      op_id: opId(),
      tx_id: null,
      entity: 'wealth_items' as const,
      record_id: ITEM,
      base_version: base,
      data: {
        name: 'Casa',
        type: 'property',
        amount: 20000000,
        currency: 'EUR',
        valued_on: '2026-11-08',
        deleted_at: null,
        ...data,
      },
    };
  }

  it('syncs an item, isolates users and does not create entries', async () => {
    const [created] = await push(alice, [itemOp(0)]);
    expect(created).toMatchObject({ status: 'applied' });
    expect(await alice.query('select count(*)::int as n from public.entries')).toEqual([{ n: 0 }]);
    expect(await bob.query('select id from public.wealth_items')).toEqual([]);

    type Pull = { changes: { entity: string }[] };
    const fresh = await alice.rpc<Pull>('sync_pull_v2', { p_since: 0 });
    expect(fresh.changes.some((change) => change.entity === 'wealth_items')).toBe(true);
    const counts = await alice.rpc<{ wealth_items: { live: number } }>('sync_counts', {});
    expect(counts.wealth_items.live).toBe(1);

    const [edited] = await push(alice, [itemOp(1, { amount: 21000000 })]);
    expect(edited).toMatchObject({ status: 'applied' });
    const [stale] = await push(alice, [itemOp(1, { amount: 1 })]);
    expect(stale).toMatchObject({ status: 'conflict' });

    await expect(
      alice.query(`insert into public.wealth_items (id, name) values ('${ITEM}', 'x')`),
    ).rejects.toThrow();
  });

  it('rejects an unknown type and a non-positive amount', async () => {
    const [badType] = await push(alice, [itemOp(0, { type: 'crypto' })]);
    expect(badType).toMatchObject({ status: 'rejected' });
    const [badAmount] = await push(alice, [itemOp(0, { amount: 0 })]);
    expect(badAmount).toMatchObject({ status: 'rejected' });
  });
});

describe('vehicles and documents', () => {
  const VEHICLE = '90000000-0000-4000-8000-000000000001';
  const DOCUMENT = '90000000-0000-4000-8000-000000000002';

  const vehicleOp = (base: number, data: Record<string, unknown> = {}) => ({
    op_id: opId(),
    tx_id: null,
    entity: 'vehicles' as const,
    record_id: VEHICLE,
    base_version: base,
    data: {
      name: 'Carrinha',
      kind: 'van',
      plate: null,
      odometer_km: 120000,
      inspection_due: '2027-01-15',
      insurance_due: null,
      deleted_at: null,
      ...data,
    },
  });
  const documentOp = (base: number, data: Record<string, unknown> = {}) => ({
    op_id: opId(),
    tx_id: null,
    entity: 'documents' as const,
    record_id: DOCUMENT,
    base_version: base,
    data: {
      title: 'Seguro auto',
      category: 'insurance',
      expires_on: '2027-03-01',
      notes: null,
      deleted_at: null,
      ...data,
    },
  });

  it('syncs both entities, counts them and isolates users', async () => {
    const [vehicle, document] = await push(alice, [vehicleOp(0), documentOp(0)]);
    expect(vehicle).toMatchObject({ status: 'applied' });
    expect(document).toMatchObject({ status: 'applied' });
    expect(await bob.query('select id from public.vehicles')).toEqual([]);
    expect(await bob.query('select id from public.documents')).toEqual([]);

    type Pull = { changes: { entity: string }[] };
    const pulled = await alice.rpc<Pull>('sync_pull_v2', { p_since: 0 });
    const entities = pulled.changes.map((change) => change.entity);
    expect(entities).toEqual(expect.arrayContaining(['vehicles', 'documents']));

    const counts = await alice.rpc<{ vehicles: { live: number }; documents: { live: number } }>(
      'sync_counts',
      {},
    );
    expect(counts.vehicles.live).toBe(1);
    expect(counts.documents.live).toBe(1);

    const [edited] = await push(alice, [vehicleOp(1, { odometer_km: 125000 })]);
    expect(edited).toMatchObject({ status: 'applied' });
    const [stale] = await push(alice, [vehicleOp(1, { odometer_km: 1 })]);
    expect(stale).toMatchObject({ status: 'conflict' });
  });

  it('rejects invalid kinds, categories and negative mileage', async () => {
    const [kind] = await push(alice, [vehicleOp(0, { kind: 'boat' })]);
    expect(kind).toMatchObject({ status: 'rejected' });
    const [km] = await push(alice, [vehicleOp(0, { odometer_km: -1 })]);
    expect(km).toMatchObject({ status: 'rejected' });
    const [category] = await push(alice, [documentOp(0, { category: 'secret' })]);
    expect(category).toMatchObject({ status: 'rejected' });
  });
});
