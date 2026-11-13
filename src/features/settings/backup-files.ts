import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Quantas cópias automáticas ficam no aparelho (as mais antigas saem). */
export const AUTO_BACKUPS_KEPT = 5;

export type StoredBackup = { name: string; createdAt: string };

/**
 * Cada cópia automática pertence a uma conta (`owner` = id do utilizador): uma conta nunca vê
 * nem restaura as cópias de outra no mesmo aparelho, e eliminar a conta apaga as suas.
 */
export const autoBackupPrefix = (owner: string) => `miven-auto-${owner}-`;

function folder(): Directory {
  // Pasta privada da app: não é sincronizada nem visível a outras apps.
  const directory = new Directory(Paths.document, 'backups');
  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

/** Grava o ficheiro e abre a folha de partilha do sistema (Ficheiros, email, etc.). */
export async function shareFile(name: string, text: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
  }
}

export type PickedBackup =
  { ok: true; text: string } | { ok: false; reason: 'cancelled' | 'readFailed' };

export async function pickBackupFile(): Promise<PickedBackup> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return { ok: false, reason: 'cancelled' };
    return { ok: true, text: await new File(asset.uri).text() };
  } catch {
    return { ok: false, reason: 'readFailed' };
  }
}

export async function listAutoBackups(owner: string): Promise<StoredBackup[]> {
  const prefix = autoBackupPrefix(owner);
  try {
    return folder()
      .list()
      .filter(
        (item): item is File =>
          item instanceof File && item.name.startsWith(prefix) && item.name.endsWith('.json'),
      )
      .map((file) => ({
        name: file.name,
        createdAt: file.name.slice(prefix.length).replace(/\.json$/, ''),
      }))
      .sort((a, b) => (a.name < b.name ? 1 : -1));
  } catch {
    return [];
  }
}

export async function saveAutoBackup(owner: string, name: string, text: string): Promise<void> {
  const file = new File(folder(), name);
  if (!file.exists) file.create();
  file.write(text);
  const all = await listAutoBackups(owner);
  for (const old of all.slice(AUTO_BACKUPS_KEPT)) new File(folder(), old.name).delete();
}

export async function readAutoBackup(owner: string, name: string): Promise<string | null> {
  if (!name.startsWith(autoBackupPrefix(owner))) return null;
  try {
    return await new File(folder(), name).text();
  } catch {
    return null;
  }
}

/** Apaga as cópias automáticas desta conta (eliminação da conta). */
export async function deleteAutoBackups(owner: string): Promise<void> {
  for (const item of await listAutoBackups(owner)) {
    try {
      new File(folder(), item.name).delete();
    } catch {
      // Já não existe.
    }
  }
}
