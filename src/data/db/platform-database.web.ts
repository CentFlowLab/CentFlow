import initSqlJs, { type SqlJsStatic } from 'sql.js';

import type { SqliteDriver } from './sql-database';
import {
  createMemoryByteStore,
  createSqlJsDriver,
  type ByteStore,
  type SqlJsDriver,
} from './sqljs-driver';

// O ficheiro WebAssembly do sql.js é servido como recurso estático pelo Metro (`wasm` em assetExts).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const wasmAsset: unknown = require('sql.js/dist/sql-wasm.wasm');

function assetUrl(asset: unknown): string {
  if (typeof asset === 'string') return asset;
  const record = asset as { uri?: string; default?: unknown } | null;
  if (record?.uri) return record.uri;
  if (record?.default) return assetUrl(record.default);
  throw new Error('sql.js wasm asset unavailable');
}

let engine: Promise<SqlJsStatic> | null = null;
function loadEngine(): Promise<SqlJsStatic> {
  engine ??= initSqlJs({ locateFile: () => assetUrl(wasmAsset) }).catch((error: unknown) => {
    engine = null;
    throw error;
  });
  return engine;
}

const DB_NAME = 'miven-sqlite';
const STORE = 'databases';

function request<T>(run: (store: IDBObjectStore) => IDBRequest<T>, mode: IDBTransactionMode) {
  return new Promise<T>((resolve, reject) => {
    const opening = indexedDB.open(DB_NAME, 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore(STORE);
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const idb = opening.result;
      const tx = idb.transaction(STORE, mode);
      const result = run(tx.objectStore(STORE));
      tx.oncomplete = () => {
        idb.close();
        resolve(result.result);
      };
      tx.onerror = tx.onabort = () => {
        idb.close();
        reject(tx.error);
      };
    };
  });
}

/** IndexedDB existe em todos os browsers atuais; sem ele, a sessão fica só em memória. */
function createIndexedDbStore(): ByteStore {
  if (typeof indexedDB === 'undefined') return createMemoryByteStore();
  const memory = createMemoryByteStore();
  let usable = true;
  return {
    async load(name) {
      if (!usable) return memory.load(name);
      try {
        const value = await request((store) => store.get(name) as IDBRequest<unknown>, 'readonly');
        return value instanceof Uint8Array
          ? value
          : value instanceof ArrayBuffer
            ? new Uint8Array(value)
            : null;
      } catch {
        usable = false;
        return memory.load(name);
      }
    },
    async save(name, bytes) {
      if (!usable) return memory.save(name, bytes);
      try {
        await request((store) => store.put(bytes, name), 'readwrite');
      } catch {
        usable = false;
        await memory.save(name, bytes);
      }
    },
    async remove(name) {
      await memory.remove(name);
      if (!usable) return;
      await request((store) => store.delete(name), 'readwrite').catch(() => undefined);
    },
  };
}

const store = createIndexedDbStore();
const drivers = new Set<SqlJsDriver>();

/** Grava o que falta quando o separador é escondido ou fechado. */
if (typeof window !== 'undefined') {
  const flushAll = () => void flushPlatformDatabases();
  window.addEventListener('pagehide', flushAll);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAll();
  });
  // Pedir ao browser para não apagar os dados por falta de espaço (sem efeito se recusar).
  void navigator.storage?.persist?.().catch(() => undefined);
}

export async function openPlatformDatabase(name: string): Promise<SqliteDriver> {
  const driver = await createSqlJsDriver(await loadEngine(), name, store);
  drivers.add(driver);
  const close = driver.closeAsync;
  driver.closeAsync = async () => {
    drivers.delete(driver);
    await close();
  };
  return driver;
}

export function deletePlatformDatabase(name: string): Promise<void> {
  return store.remove(name);
}

export async function flushPlatformDatabases(): Promise<void> {
  await Promise.all([...drivers].map((driver) => driver.flush()));
}
