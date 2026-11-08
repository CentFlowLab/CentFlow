import type { SqlDatabase } from '../db/sql-database';
import type { DataEntity, Repositories } from '../repositories/types';
import { createSqliteAccountRepository } from './account-repository';
import { createSqliteCategoryRepository } from './category-repository';
import type { SqliteRepositoryContext } from './context';
import { createSqliteEntryRepository } from './entry-repository';

export type SqliteRepositoryOptions = {
  newId: () => string;
  now?: () => Date;
};

export function createSqliteRepositories(
  db: SqlDatabase,
  { newId, now = () => new Date() }: SqliteRepositoryOptions,
): Repositories {
  const listeners = new Set<(entities: readonly DataEntity[]) => void>();
  const context: SqliteRepositoryContext = {
    db,
    newId,
    now: () => now().toISOString(),
    notify: (entities) => {
      for (const listener of [...listeners]) listener(entities);
    },
  };

  return {
    accounts: createSqliteAccountRepository(context),
    categories: createSqliteCategoryRepository(context),
    entries: createSqliteEntryRepository(context),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
