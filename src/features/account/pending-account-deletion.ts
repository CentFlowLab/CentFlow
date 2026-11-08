import type { KeyValueStore } from '@/lib/storage/key-value-store';

const KEY = 'account-deletion';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PendingAccountDeletion = { userId: string; phase: 'local' };

export async function markPendingAccountDeletion(
  storage: KeyValueStore,
  userId: string,
): Promise<void> {
  const pending: PendingAccountDeletion = { userId, phase: 'local' };
  await storage.setItem(KEY, JSON.stringify(pending));
}

export async function readPendingAccountDeletion(
  storage: KeyValueStore,
): Promise<PendingAccountDeletion | null> {
  const raw = await storage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingAccountDeletion>;
    if (
      parsed.phase !== 'local' ||
      typeof parsed.userId !== 'string' ||
      !UUID.test(parsed.userId)
    ) {
      return null;
    }
    return { userId: parsed.userId, phase: 'local' };
  } catch {
    return null;
  }
}

export async function clearPendingAccountDeletion(storage: KeyValueStore): Promise<void> {
  await storage.removeItem(KEY);
}

/**
 * Continua uma eliminação que ficou a meio. O marcador é escrito depois de o servidor
 * confirmar e só é apagado quando a base local desaparece. Repetir é seguro.
 */
export async function resumePendingAccountDeletion({
  storage,
  currentUserId,
  signOut,
  deleteSpace,
}: {
  storage: KeyValueStore;
  currentUserId: string | null;
  signOut: () => Promise<void>;
  deleteSpace: (userId: string) => Promise<void>;
}): Promise<void> {
  const pending = await readPendingAccountDeletion(storage);
  if (!pending) {
    const raw = await storage.getItem(KEY);
    if (raw) await clearPendingAccountDeletion(storage);
    return;
  }
  if (currentUserId === pending.userId) await signOut();
  await deleteSpace(pending.userId);
  await clearPendingAccountDeletion(storage);
}
