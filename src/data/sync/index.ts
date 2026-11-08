import type { SqlDatabase } from '../db/sql-database';
import type { Repositories } from '../repositories/types';
import { createChangeHub, createSqliteRepositories } from '../sqlite';
import { createSyncStore, type SyncStore } from '../sqlite/sync-store';

export { createSyncEngine, type SyncEngine, type SyncSnapshot, type SyncStatus } from './engine';
export * from './transport';

export type LocalStore = {
  db: SqlDatabase;
  repositories: Repositories;
  sync: SyncStore;
};

/** Repositórios e armazenamento de sincronização sobre a mesma base de dados e avisos. */
export function createLocalStore(
  db: SqlDatabase,
  { newId, now = () => new Date() }: { newId: () => string; now?: () => Date },
): LocalStore {
  const changes = createChangeHub();
  return {
    db,
    repositories: createSqliteRepositories(db, { newId, now, changes }),
    sync: createSyncStore(db, { newId, now: () => now().toISOString(), notify: changes.notify }),
  };
}
