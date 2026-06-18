import * as SecureStore from 'expo-secure-store';

import type { Credit } from '@/lib/domain/types';
import type { Subscription } from '@/lib/domain/assets.types';

import { userScopedSecureKey } from './secure-store-key';

const creditsKey = (userId: string) => userScopedSecureKey('credits', userId);
const subscriptionsKey = (userId: string) => userScopedSecureKey('subscriptions', userId);

/** Chave legacy (inválida no SecureStore iOS) — só para migração de leitura. */
const legacyCreditsKey = (userId: string) => `centflow:credits:${userId}`;
const legacySubscriptionsKey = (userId: string) => `centflow:subscriptions:${userId}`;

export type LiabilitiesData = {
  credits: Credit[];
  subscriptions: Subscription[];
};

async function readJson<T>(primaryKey: string, legacyKey: string): Promise<T | null> {
  let raw = await SecureStore.getItemAsync(primaryKey);
  if (!raw) {
    raw = await SecureStore.getItemAsync(legacyKey);
    if (raw) {
      await SecureStore.setItemAsync(primaryKey, raw);
      await SecureStore.deleteItemAsync(legacyKey).catch(() => {});
    }
  }
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function loadLiabilities(userId: string): Promise<LiabilitiesData> {
  try {
    const [credits, subscriptions] = await Promise.all([
      readJson<Credit[]>(creditsKey(userId), legacyCreditsKey(userId)),
      readJson<Subscription[]>(subscriptionsKey(userId), legacySubscriptionsKey(userId)),
    ]);

    return {
      credits: credits ?? [],
      subscriptions: subscriptions ?? [],
    };
  } catch {
    return { credits: [], subscriptions: [] };
  }
}

export async function saveCredits(userId: string, credits: Credit[]): Promise<void> {
  await SecureStore.setItemAsync(creditsKey(userId), JSON.stringify(credits));
}

export async function saveSubscriptions(
  userId: string,
  subscriptions: Subscription[],
): Promise<void> {
  await SecureStore.setItemAsync(subscriptionsKey(userId), JSON.stringify(subscriptions));
}
