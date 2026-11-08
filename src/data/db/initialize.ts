import { migrate } from './migrations';
import {
  createSqlDatabase,
  type SqlDatabase,
  type SqliteDriver,
  type TransactionHooks,
} from './sql-database';

export type InitializeOptions = {
  /** WAL melhora o desempenho em nativo; não é suportado pelo VFS OPFS da web. */
  useWriteAheadLog: boolean;
};

/**
 * Cada transação recebe um identificador próprio: as alterações registadas para sincronizar
 * dentro da mesma transação são aplicadas no servidor como um grupo atómico.
 */
const SYNC_TRANSACTION_HOOKS: TransactionHooks = {
  begin: `UPDATE sync_state SET current_tx = lower(hex(randomblob(16))) WHERE id = 1;`,
  end: `UPDATE sync_state SET current_tx = NULL WHERE id = 1;`,
};

/**
 * Prepara uma ligação: integridade referencial, modo de journal e migrações.
 * `PRAGMA foreign_keys` tem de ser definido fora de transações e em cada ligação.
 */
export async function initializeDatabase(
  driver: SqliteDriver,
  { useWriteAheadLog }: InitializeOptions,
): Promise<SqlDatabase> {
  let hooks: TransactionHooks | null = null;
  const db = createSqlDatabase(driver, { transactionHooks: () => hooks });
  try {
    await db.exec('PRAGMA foreign_keys = ON;');
    if (useWriteAheadLog) await db.exec('PRAGMA journal_mode = WAL;');
    const fk = await db.first<{ foreign_keys: number }>('PRAGMA foreign_keys');
    if (fk?.foreign_keys !== 1) throw new Error('SQLite foreign key enforcement is unavailable');
    const { to } = await migrate(db);
    if (to >= 2) hooks = SYNC_TRANSACTION_HOOKS;
    return db;
  } catch (error) {
    await db.close().catch(() => undefined);
    throw error;
  }
}
