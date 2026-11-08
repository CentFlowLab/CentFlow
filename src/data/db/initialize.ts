import { migrate } from './migrations';
import { createSqlDatabase, type SqlDatabase, type SqliteDriver } from './sql-database';

export type InitializeOptions = {
  /** WAL melhora o desempenho em nativo; não é suportado pelo VFS OPFS da web. */
  useWriteAheadLog: boolean;
};

/**
 * Prepara uma ligação: integridade referencial, modo de journal e migrações.
 * `PRAGMA foreign_keys` tem de ser definido fora de transações e em cada ligação.
 */
export async function initializeDatabase(
  driver: SqliteDriver,
  { useWriteAheadLog }: InitializeOptions,
): Promise<SqlDatabase> {
  const db = createSqlDatabase(driver);
  try {
    await db.exec('PRAGMA foreign_keys = ON;');
    if (useWriteAheadLog) await db.exec('PRAGMA journal_mode = WAL;');
    const fk = await db.first<{ foreign_keys: number }>('PRAGMA foreign_keys');
    if (fk?.foreign_keys !== 1) throw new Error('SQLite foreign key enforcement is unavailable');
    await migrate(db);
    return db;
  } catch (error) {
    await db.close().catch(() => undefined);
    throw error;
  }
}
