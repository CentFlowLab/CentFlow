import { randomUUID } from 'expo-crypto';
import { openDatabaseAsync } from 'expo-sqlite';
import { Platform } from 'react-native';

import { DatabaseUnavailableError, toDatabaseUnavailableError } from './db/errors';
import { initializeDatabase } from './db/initialize';
import type { Repositories } from './repositories/types';
import { createSqliteRepositories } from './sqlite';

export const DATABASE_NAME = 'centflow.db';

type LockManagerLike = {
  request(
    name: string,
    options: { ifAvailable: boolean },
    callback: (lock: unknown) => Promise<void> | void,
  ): Promise<unknown>;
};

let tabLock: Promise<boolean> | null = null;

/**
 * Web: o VFS OPFS do expo-sqlite só permite uma ligação por origem. Um Web Lock
 * mantido durante a vida do separador deteta outro separador aberto antes de abrir
 * a base de dados, com uma mensagem clara em vez de um erro do VFS.
 */
function acquireTabLock(): Promise<boolean> {
  const locks = (globalThis.navigator as { locks?: LockManagerLike } | undefined)?.locks;
  if (!locks) return Promise.resolve(true);
  tabLock ??= new Promise<boolean>((resolve) => {
    locks
      .request('centflow-database', { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(false);
          return;
        }
        resolve(true);
        return new Promise<void>(() => undefined);
      })
      .catch(() => resolve(true));
  }).then((acquired) => {
    if (!acquired) tabLock = null;
    return acquired;
  });
  return tabLock;
}

async function assertWebEnvironment(): Promise<void> {
  if (globalThis.crossOriginIsolated !== true || typeof SharedArrayBuffer === 'undefined') {
    throw new DatabaseUnavailableError('notIsolated');
  }
  if (!(await acquireTabLock())) throw new DatabaseUnavailableError('otherTab');
}

let opening: Promise<Repositories> | null = null;

/**
 * Abre (uma única vez por processo/separador) a base de dados local e devolve os repositórios.
 * Em caso de falha, a próxima chamada volta a tentar.
 */
export function openAppRepositories(): Promise<Repositories> {
  opening ??= (async () => {
    try {
      const isWeb = Platform.OS === 'web';
      if (isWeb) await assertWebEnvironment();
      const driver = await openDatabaseAsync(DATABASE_NAME);
      const db = await initializeDatabase(driver, { useWriteAheadLog: !isWeb });
      return createSqliteRepositories(db, { newId: randomUUID });
    } catch (error) {
      opening = null;
      throw toDatabaseUnavailableError(error);
    }
  })();
  return opening;
}
