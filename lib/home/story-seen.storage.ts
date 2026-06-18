import * as SecureStore from 'expo-secure-store';

import { userScopedSecureKey } from '@/lib/storage/secure-store-key';

export type HomeStoryId = 'profile' | 'changes' | 'attention';

export type HomeStorySeenState = {
  profileSignature?: string;
  changesSignature?: string;
  attentionSignature?: string;
};

const storageKey = (userId: string) => userScopedSecureKey('home_stories_seen', userId);
const legacyKey = (userId: string) => `centflow:home-stories-seen:${userId}`;

export async function loadStorySeenState(userId: string): Promise<HomeStorySeenState> {
  try {
    let raw = await SecureStore.getItemAsync(storageKey(userId));
    if (!raw) {
      raw = await SecureStore.getItemAsync(legacyKey(userId));
      if (raw) {
        await SecureStore.setItemAsync(storageKey(userId), raw);
        await SecureStore.deleteItemAsync(legacyKey(userId)).catch(() => {});
      }
    }
    return raw ? (JSON.parse(raw) as HomeStorySeenState) : {};
  } catch {
    return {};
  }
}

export async function saveStorySeenState(
  userId: string,
  patch: Partial<HomeStorySeenState>,
): Promise<HomeStorySeenState> {
  const current = await loadStorySeenState(userId);
  const next = { ...current, ...patch };
  await SecureStore.setItemAsync(storageKey(userId), JSON.stringify(next));
  return next;
}

export function buildProfileSignature(score: number, pendingCount: number): string {
  return `${score}|${pendingCount}`;
}

export function buildChangesSignature(
  weeklySpending: number,
  netWorthChangeThisMonth: number,
  personalInflation: number | null,
): string {
  return `${weeklySpending.toFixed(2)}|${netWorthChangeThisMonth.toFixed(2)}|${personalInflation ?? 'null'}`;
}

export function buildAttentionSignature(ids: string[]): string {
  return [...ids].sort().join(',');
}
