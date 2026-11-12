import { createSqliteBackupRepository } from './backup-repository';
import type { SqlDatabase } from '../db/sql-database';
import type { Repositories } from '../repositories/types';
import { createSqliteAccountRepository } from './account-repository';
import { createSqliteBudgetRepository } from './budget-repository';
import { createSqliteCategoryRepository } from './category-repository';
import { createChangeHub, type ChangeHub, type SqliteRepositoryContext } from './context';
import { createSqliteEntryRepository } from './entry-repository';
import { createSqliteSavingsGoalRepository } from './goal-repository';
import { createSqliteSubscriptionRepository } from './subscription-repository';
import { createSqliteWealthRepository } from './wealth-repository';
import { createSqliteVehicleRepository } from './vehicle-repository';
import { createSqliteDocumentRepository } from './document-repository';
import { createSqliteAttachmentUploadRepository } from './attachment-upload-repository';

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
    goals: createSqliteSavingsGoalRepository(context),
    wealth: createSqliteWealthRepository(context),
    vehicles: createSqliteVehicleRepository(context),
    documents: createSqliteDocumentRepository(context),
    attachmentUploads: createSqliteAttachmentUploadRepository(context),
    categories: createSqliteCategoryRepository(context),
    entries: createSqliteEntryRepository(context),
    backup: createSqliteBackupRepository(context),
    subscribe: changes.subscribe,
  };
}
