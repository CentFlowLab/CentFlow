import * as SecureStore from 'expo-secure-store';

import type { Credit } from '@/lib/domain/types';
import type { Subscription } from '@/lib/domain/assets.types';

const creditsKey = (userId: string) => `centflow:credits:${userId}`;
const subscriptionsKey = (userId: string) => `centflow:subscriptions:${userId}`;

export type LiabilitiesData = {
  credits: Credit[];
  subscriptions: Subscription[];
};

export async function loadLiabilities(userId: string): Promise<LiabilitiesData> {
  try {
    const [creditsRaw, subscriptionsRaw] = await Promise.all([
      SecureStore.getItemAsync(creditsKey(userId)),
      SecureStore.getItemAsync(subscriptionsKey(userId)),
    ]);

    return {
      credits: creditsRaw ? (JSON.parse(creditsRaw) as Credit[]) : [],
      subscriptions: subscriptionsRaw ? (JSON.parse(subscriptionsRaw) as Subscription[]) : [],
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
