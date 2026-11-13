import * as DocumentPicker from 'expo-document-picker';

export const AUTO_BACKUPS_KEPT = 5;

export type StoredBackup = { name: string; createdAt: string };

/** Cada cópia automática pertence a uma conta (ver backup-files.ts). */
export const autoBackupPrefix = (owner: string) => `miven-auto-${owner}-`;

/** Web e Windows: descarrega o ficheiro (pasta Transferências ou a escolhida pela pessoa). */
export async function shareFile(name: string, text: string, mimeType: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([text], { type: `${mimeType};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type PickedBackup =
  { ok: true; text: string } | { ok: false; reason: 'cancelled' | 'readFailed' };

export async function pickBackupFile(): Promise<PickedBackup> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain'],
      multiple: false,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset?.file) return { ok: false, reason: 'cancelled' };
    return { ok: true, text: await asset.file.text() };
  } catch {
    return { ok: false, reason: 'readFailed' };
  }
}

// Cópias automáticas no IndexedDB (o mesmo sítio da base de dados web, ADR-060).
const DB_NAME = 'miven-backups';
const STORE = 'snapshots';

function run<T>(mode: IDBTransactionMode, task: (store: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('unavailable'));
      return;
    }
    const opening = indexedDB.open(DB_NAME, 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore(STORE);
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const idb = opening.result;
      const tx = idb.transaction(STORE, mode);
      const request = task(tx.objectStore(STORE));
      tx.oncomplete = () => {
        idb.close();
        resolve(request.result);
      };
      tx.onerror = tx.onabort = () => {
        idb.close();
        reject(tx.error);
      };
    };
  });
}

export async function listAutoBackups(owner: string): Promise<StoredBackup[]> {
  const prefix = autoBackupPrefix(owner);
  try {
    const keys = (await run('readonly', (store) => store.getAllKeys())) as string[];
    return keys
      .filter((name) => name.startsWith(prefix))
      .map((name) => ({ name, createdAt: name.slice(prefix.length).replace(/\.json$/, '') }))
      .sort((a, b) => (a.name < b.name ? 1 : -1));
  } catch {
    return [];
  }
}

export async function saveAutoBackup(owner: string, name: string, text: string): Promise<void> {
  await run('readwrite', (store) => store.put(text, name));
  const all = await listAutoBackups(owner);
  for (const old of all.slice(AUTO_BACKUPS_KEPT)) {
    await run('readwrite', (store) => store.delete(old.name));
  }
}

export async function readAutoBackup(owner: string, name: string): Promise<string | null> {
  if (!name.startsWith(autoBackupPrefix(owner))) return null;
  try {
    const value = await run('readonly', (store) => store.get(name) as IDBRequest<unknown>);
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

/** Apaga as cópias automáticas desta conta (eliminação da conta). */
export async function deleteAutoBackups(owner: string): Promise<void> {
  for (const item of await listAutoBackups(owner)) {
    await run('readwrite', (store) => store.delete(item.name)).catch(() => undefined);
  }
}
