import * as SecureStore from 'expo-secure-store';

import { userScopedSecureKey } from '@/lib/storage/secure-store-key';

const storageKey = (userId: string) => userScopedSecureKey('ignored_spending_habits', userId);

export async function loadIgnoredSpendingHabits(userId: string): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(storageKey(userId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function ignoreSpendingHabit(
  userId: string,
  habitId: string,
): Promise<string[]> {
  const current = await loadIgnoredSpendingHabits(userId);
  if (current.includes(habitId)) return current;

  const next = [...current, habitId];
  await SecureStore.setItemAsync(storageKey(userId), JSON.stringify(next));
  return next;
}
