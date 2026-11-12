import { deleteDatabaseAsync, openDatabaseAsync } from 'expo-sqlite';

import type { SqliteDriver } from './sql-database';

/** iOS e Android: o expo-sqlite nativo. A web usa `platform-database.web.ts`. */
export function openPlatformDatabase(name: string): Promise<SqliteDriver> {
  return openDatabaseAsync(name);
}

export function deletePlatformDatabase(name: string): Promise<void> {
  return deleteDatabaseAsync(name);
}

/** Na web o ficheiro é guardado logo após cada escrita; no nativo não há nada a fazer. */
export async function flushPlatformDatabases(): Promise<void> {}
