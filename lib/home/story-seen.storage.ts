import * as SecureStore from 'expo-secure-store';

export type HomeStoryId = 'profile' | 'changes' | 'attention';

export type HomeStorySeenState = {
  profileSignature?: string;
  changesSignature?: string;
  attentionSignature?: string;
};

const key = (userId: string) => `centflow:home-stories-seen:${userId}`;

export async function loadStorySeenState(userId: string): Promise<HomeStorySeenState> {
  try {
    const raw = await SecureStore.getItemAsync(key(userId));
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
  await SecureStore.setItemAsync(key(userId), JSON.stringify(next));
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
