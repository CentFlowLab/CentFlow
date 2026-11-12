import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';

import { DatabaseUnavailableError, toDatabaseUnavailableError } from './db/errors';
import { initializeDatabase } from './db/initialize';
import { deletePlatformDatabase, openPlatformDatabase } from './db/platform-database';
import { attachSpace } from './local-space';
import { startQuickEntryBridge } from './quick-entry/quick-entry-bridge';
import { databaseNameFor, type LocalSpace } from './spaces';
import { createLocalStore, type LocalStore } from './sync';

type LockManagerLike = {
  request(
    name: string,
    options: { ifAvailable: boolean },
    callback: (lock: unknown) => Promise<void> | void,
  ): Promise<unknown>;
};

let tabLock: Promise<boolean> | null = null;

/**
 * Web: a base de dados vive na memória da página e é gravada inteira no IndexedDB (ADR-060).
 * Dois separadores a gravar o mesmo ficheiro apagariam as escritas um do outro, por isso um Web
 * Lock mantido durante a vida do separador deteta outro separador aberto antes de abrir.
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
  // Sem exigência de isolamento cross-origin: o sql.js não usa SharedArrayBuffer.
  if (!(await acquireTabLock())) throw new DatabaseUnavailableError('otherTab');
}

const open = new Map<string, Promise<LocalStore>>();
/** Registo rápido (Toque posterior no iPhone) ligado à base de dados aberta de cada conta. */
const quickEntry = new Map<string, () => void>();

/**
 * Abre (uma única vez por processo/separador) a base de dados de um espaço local.
 * Em caso de falha, a próxima chamada volta a tentar.
 */
export function openLocalSpace(space: LocalSpace): Promise<LocalStore> {
  const name = databaseNameFor(space);
  let opening = open.get(name);
  if (!opening) {
    opening = (async () => {
      try {
        const isWeb = Platform.OS === 'web';
        if (isWeb) await assertWebEnvironment();
        const driver = await openPlatformDatabase(name);
        const db = await initializeDatabase(driver, { useWriteAheadLog: !isWeb });
        const store = createLocalStore(db, { newId: randomUUID });
        try {
          await attachSpace(store, space);
        } catch (error) {
          await db.close().catch(() => undefined);
          throw error;
        }
        if (space.kind === 'user') quickEntry.set(name, startQuickEntryBridge(store.repositories));
        return store;
      } catch (error) {
        open.delete(name);
        throw toDatabaseUnavailableError(error);
      }
    })();
    open.set(name, opening);
  }
  return opening;
}

const closing = new Map<string, Promise<void>>();

/** Fecha a ligação (os dados ficam no dispositivo). */
export function closeLocalSpace(space: LocalSpace): Promise<void> {
  const name = databaseNameFor(space);
  const opening = open.get(name);
  if (!opening) return closing.get(name) ?? Promise.resolve();
  open.delete(name);
  quickEntry.get(name)?.();
  quickEntry.delete(name);
  const done = (async () => {
    const store = await opening.catch(() => null);
    await store?.db.close().catch(() => undefined);
  })().finally(() => closing.delete(name));
  closing.set(name, done);
  return done;
}

/** Apaga definitivamente a cópia local de um espaço (ex.: depois de eliminar a conta). */
export async function deleteLocalSpace(space: LocalSpace): Promise<void> {
  await closeLocalSpace(space);
  await deletePlatformDatabase(databaseNameFor(space));
}
