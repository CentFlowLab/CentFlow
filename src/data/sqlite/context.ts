import type { SqlDatabase } from '../db/sql-database';
import type { DataEntity } from '../repositories/types';

export type SqliteRepositoryContext = {
  db: SqlDatabase;
  newId: () => string;
  /** Instante atual em ISO 8601 UTC. */
  now: () => string;
  notify: (entities: readonly DataEntity[]) => void;
};

export type ChangeListener = (entities: readonly DataEntity[]) => void;

/** Avisos de alterações partilhados entre os repositórios e a sincronização. */
export type ChangeHub = {
  notify: ChangeListener;
  subscribe(listener: ChangeListener): () => void;
};

export function createChangeHub(): ChangeHub {
  const listeners = new Set<ChangeListener>();
  return {
    notify: (entities) => {
      for (const listener of [...listeners]) listener(entities);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

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
