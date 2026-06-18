import * as SecureStore from 'expo-secure-store';

import { userScopedSecureKey } from '@/lib/storage/secure-store-key';

const storageKey = (userId: string) => userScopedSecureKey('dismissed_sub_detections', userId);
const legacyKey = (userId: string) => `centflow:dismissed-sub-detections:${userId}`;

export async function loadDismissedSubscriptionDetections(userId: string): Promise<string[]> {
  try {
    let raw = await SecureStore.getItemAsync(storageKey(userId));
    if (!raw) {
      raw = await SecureStore.getItemAsync(legacyKey(userId));
      if (raw) {
        await SecureStore.setItemAsync(storageKey(userId), raw);
        await SecureStore.deleteItemAsync(legacyKey(userId)).catch(() => {});
      }
    }
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function dismissSubscriptionDetection(
  userId: string,
  detectionId: string,
): Promise<string[]> {
  const current = await loadDismissedSubscriptionDetections(userId);
  if (current.includes(detectionId)) return current;

  const next = [...current, detectionId];
  await SecureStore.setItemAsync(storageKey(userId), JSON.stringify(next));
  return next;
}
