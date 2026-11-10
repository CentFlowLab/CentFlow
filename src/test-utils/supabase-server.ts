import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

import { createPglite, type Pg, type PgIdentity } from './pglite';

/**
 * O mínimo do Supabase de que as migrações dependem: roles, `auth.users`, `auth.uid()` e os
 * privilégios por omissão do esquema `public` num projeto alojado (tudo concedido a anon e
 * authenticated), para provar que as migrações os revogam.
 */
const SUPABASE_SHIM = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export function readServerMigrations(): { name: string; sql: string }[] {
  const directory = join(cwd(), 'supabase', 'migrations');
  return readdirSync(directory)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(directory, name), 'utf8') }));
}

export type ServerSession = {
  userId: string;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T>;
};

export type TestServer = {
  pg: Pg;
  createUser(id: string, email?: string): Promise<ServerSession>;
  session(userId: string): ServerSession;
  anonymous(): Pick<ServerSession, 'query'>;
  close(): Promise<void>;
};

const RPC_SIGNATURES: Record<string, string[]> = {
  sync_push: ['p_ops::jsonb'],
  sync_pull: ['p_since::bigint', 'p_limit::int'],
  sync_pull_v2: ['p_since::bigint', 'p_limit::int'],
  sync_verify: ['p_records::jsonb'],
  sync_counts: [],
};

/** Supabase simulado em PGlite com as migrações reais de `supabase/migrations`. */
export async function createTestServer(): Promise<TestServer> {
  const pg = await createPglite();
  await pg.exec(SUPABASE_SHIM);
  for (const migration of readServerMigrations()) {
    await pg.exec(migration.sql);
  }

  function session(userId: string): ServerSession {
    const identity: PgIdentity = { role: 'authenticated', sub: userId };
    return {
      userId,
      query: (sql, params) => pg.query(sql, params, identity),
      async rpc<T>(fn: string, args: Record<string, unknown>) {
        const signature = RPC_SIGNATURES[fn];
        if (!signature) throw new Error(`Unknown RPC ${fn}`);
        const values = signature.map((parameter) => {
          const [name = ''] = parameter.split('::');
          const value = args[name];
          return value === undefined
            ? null
            : typeof value === 'object'
              ? JSON.stringify(value)
              : value;
        });
        const placeholders = signature.map((parameter, index) => {
          const [name, type] = parameter.split('::');
          return `${name} => $${index + 1}::${type}`;
        });
        const rows = await pg.query<{ result: T }>(
          `select public.${fn}(${placeholders.join(', ')}) as result`,
          values,
          identity,
        );
        return rows[0]!.result;
      },
    };
  }

  return {
    pg,
    async createUser(id, email = `${id}@example.test`) {
      await pg.query('insert into auth.users (id, email) values ($1, $2)', [id, email]);
      return session(id);
    },
    session,
    anonymous: () => ({ query: (sql, params) => pg.query(sql, params, { role: 'anon' }) }),
    close: () => pg.close(),
  };
}
