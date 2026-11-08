import type { SqlDatabase } from '../db/sql-database';
import type { Repositories } from '../repositories/types';
import { createSqliteAccountRepository } from './account-repository';
import { createSqliteBudgetRepository } from './budget-repository';
import { createSqliteCategoryRepository } from './category-repository';
import { createChangeHub, type ChangeHub, type SqliteRepositoryContext } from './context';
import { createSqliteEntryRepository } from './entry-repository';
import { createSqliteSubscriptionRepository } from './subscription-repository';

export { createChangeHub, type ChangeHub } from './context';

export type SqliteRepositoryOptions = {
  newId: () => string;
  now?: () => Date;
  /** Partilhado com a sincronização, para que as alterações recebidas atualizem os ecrãs. */
  changes?: ChangeHub;
};

export function createSqliteRepositories(
  db: SqlDatabase,
  { newId, now = () => new Date(), changes = createChangeHub() }: SqliteRepositoryOptions,
): Repositories {
  const context: SqliteRepositoryContext = {
    db,
    newId,
    now: () => now().toISOString(),
    notify: changes.notify,
  };

  return {
    accounts: createSqliteAccountRepository(context),
    budgets: createSqliteBudgetRepository(context),
    subscriptions: createSqliteSubscriptionRepository(context),
    categories: createSqliteCategoryRepository(context),
    entries: createSqliteEntryRepository(context),
    subscribe: changes.subscribe,
  };
}
