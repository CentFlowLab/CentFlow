import * as SecureStore from 'expo-secure-store';

import { userScopedSecureKey } from '@/lib/storage/secure-store-key';

export type LastQuickExpense = {
  amount: number;
  categoryId: string;
  merchant?: string;
  note?: string;
};

function storageKey(userId: string): string {
  return userScopedSecureKey('last_quick_expense', userId);
}

export async function loadLastQuickExpense(userId: string): Promise<LastQuickExpense | null> {
  try {
    const raw = await SecureStore.getItemAsync(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastQuickExpense;
    if (!parsed?.amount || !parsed?.categoryId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveLastQuickExpense(
  userId: string,
  expense: LastQuickExpense,
): Promise<void> {
  await SecureStore.setItemAsync(storageKey(userId), JSON.stringify(expense));
}
