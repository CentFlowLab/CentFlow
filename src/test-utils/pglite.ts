import { join } from 'node:path';
import { cwd } from 'node:process';
import { Worker } from 'node:worker_threads';

export class PgError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
  ) {
    super(message);
    this.name = 'PgError';
  }
}

export type PgIdentity = { role: 'anon' | 'authenticated' | 'service_role'; sub?: string };

export type Pg = {
  exec(sql: string): Promise<void>;
  /** Sem identidade corre como superutilizador (preparação dos testes). */
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
    identity?: PgIdentity,
  ): Promise<T[]>;
  close(): Promise<void>;
};

type Reply = { id: number; result?: unknown; error?: { message: string; code: string | null } };

/**
 * PostgreSQL real (PGlite, WASM) num worker_thread: o PGlite não arranca dentro do sistema de
 * módulos do Jest. Cada instância é uma base de dados nova em memória.
 */
export async function createPglite(): Promise<Pg> {
  const worker = new Worker(join(cwd(), 'src', 'test-utils', 'pglite-worker.mjs'));
  const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (e: Error) => void }
  >();
  let nextId = 0;

  await new Promise<void>((resolve, reject) => {
    worker.once('error', reject);
    worker.once('message', () => resolve());
  });
  worker.on('message', (reply: Reply) => {
    const request = pending.get(reply.id);
    if (!request) return;
    pending.delete(reply.id);
    if (reply.error) request.reject(new PgError(reply.error.message, reply.error.code));
    else request.resolve(reply.result);
  });

  function send(message: Record<string, unknown>): Promise<unknown> {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, ...message });
    });
  }

  return {
    async exec(sql) {
      await send({ kind: 'exec', sql });
    },
    async query<T>(sql: string, params?: unknown[], identity?: PgIdentity) {
      return (await send({ kind: 'query', sql, params, identity })) as T[];
    },
    async close() {
      await send({ kind: 'close' });
      await worker.terminate();
    },
  };
}
