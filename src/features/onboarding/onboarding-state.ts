import { appStorage, type KeyValueStore } from '@/lib/storage/key-value-store';

/** O onboarding foi visto (concluído ou saltado) neste dispositivo. Preferência não sensível. */
const KEY = 'onboarding:seen';

export async function hasSeenOnboarding(storage: KeyValueStore = appStorage): Promise<boolean> {
  try {
    return (await storage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markOnboardingSeen(storage: KeyValueStore = appStorage): Promise<void> {
  try {
    await storage.setItem(KEY, '1');
  } catch {
    console.error('[onboarding] mark_failed');
  }
}
