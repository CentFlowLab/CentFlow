import type { SqlDatabase } from '../db/sql-database';
import type { DataEntity } from '../repositories/types';

export type SqliteRepositoryContext = {
  db: SqlDatabase;
  newId: () => string;
  /** Instante atual em ISO 8601 UTC. */
  now: () => string;
  notify: (entities: readonly DataEntity[]) => void;
};

/** Executa uma escrita e notifica apenas depois de confirmada. */
export async function write<T>(
  context: SqliteRepositoryContext,
  entities: readonly DataEntity[],
  operation: () => Promise<T>,
): Promise<T> {
  const result = await operation();
  context.notify(entities);
  return result;
}
