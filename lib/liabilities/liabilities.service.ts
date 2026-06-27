import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { logAppError } from '@/lib/diagnostics/app-log';
import type { Subscription } from '@/lib/domain/assets.types';
import type { Credit } from '@/lib/domain/types';
import {
  deleteCreditFromSupabase,
  deleteSubscriptionFromSupabase,
  fetchLiabilitiesFromSupabase,
  syncLocalLiabilitiesToSupabase,
  upsertCreditToSupabase,
  upsertSubscriptionToSupabase,
} from '@/lib/supabase/liabilities';
import { isSupabaseEnabled } from '@/lib/supabase/config';
import {
  loadLiabilities,
  saveCredits,
  saveSubscriptions,
  type LiabilitiesData,
} from '@/lib/storage/liabilities-storage';

async function cacheLocally(userId: string, data: LiabilitiesData): Promise<void> {
  await Promise.all([
    saveCredits(userId, data.credits),
    saveSubscriptions(userId, data.subscriptions),
  ]);
}

export async function fetchLiabilitiesForUser(userId: string): Promise<LiabilitiesData> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    return loadLiabilities(userId);
  }

  try {
    const remote = await fetchLiabilitiesFromSupabase();
    const local = await loadLiabilities(userId);

    if (
      remote.credits.length === 0 &&
      remote.subscriptions.length === 0 &&
      (local.credits.length > 0 || local.subscriptions.length > 0)
    ) {
      const migrated = await syncLocalLiabilitiesToSupabase(
        local.credits,
        local.subscriptions,
      );
      await cacheLocally(userId, migrated);
      return migrated;
    }

    await cacheLocally(userId, remote);
    return remote;
  } catch {
    return loadLiabilities(userId);
  }
}

export async function saveCreditForUser(userId: string, credit: Credit): Promise<Credit> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    const current = await loadLiabilities(userId);
    const credits = current.credits.some((item) => item.id === credit.id)
      ? current.credits.map((item) => (item.id === credit.id ? credit : item))
      : [...current.credits, credit];
    await saveCredits(userId, credits);
    return credit;
  }

  try {
    const saved = await upsertCreditToSupabase(credit);
    const current = await loadLiabilities(userId);
    const credits = current.credits.some((item) => item.id === credit.id)
      ? current.credits.map((item) => (item.id === credit.id ? saved : item))
      : [...current.credits.filter((item) => item.id !== credit.id), saved];
    await saveCredits(userId, credits);
    return saved;
  } catch (error) {
    // O Supabase falhou (ex.: coluna em falta, RLS, rede). Antes ficava
    // totalmente silencioso e o crédito desaparecia no refetch seguinte.
    logAppError('liabilities.saveCredit', error, { creditId: credit.id });
    const current = await loadLiabilities(userId);
    const credits = current.credits.some((item) => item.id === credit.id)
      ? current.credits.map((item) => (item.id === credit.id ? credit : item))
      : [...current.credits, credit];
    await saveCredits(userId, credits);
    return credit;
  }
}

export async function deleteCreditForUser(userId: string, id: string): Promise<void> {
  if (!isMockAuthEnabled() && isSupabaseEnabled()) {
    try {
      await deleteCreditFromSupabase(id);
    } catch {
      // fallback local
    }
  }

  const current = await loadLiabilities(userId);
  await saveCredits(
    userId,
    current.credits.filter((item) => item.id !== id),
  );
}

export async function saveSubscriptionForUser(
  userId: string,
  subscription: Subscription,
): Promise<Subscription> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    const current = await loadLiabilities(userId);
    const subscriptions = current.subscriptions.some((item) => item.id === subscription.id)
      ? current.subscriptions.map((item) => (item.id === subscription.id ? subscription : item))
      : [...current.subscriptions, subscription];
    await saveSubscriptions(userId, subscriptions);
    return subscription;
  }

  try {
    const saved = await upsertSubscriptionToSupabase(subscription);
    const current = await loadLiabilities(userId);
    const subscriptions = current.subscriptions.some((item) => item.id === subscription.id)
      ? current.subscriptions.map((item) => (item.id === subscription.id ? saved : item))
      : [...current.subscriptions.filter((item) => item.id !== subscription.id), saved];
    await saveSubscriptions(userId, subscriptions);
    return saved;
  } catch {
    const current = await loadLiabilities(userId);
    const subscriptions = current.subscriptions.some((item) => item.id === subscription.id)
      ? current.subscriptions.map((item) => (item.id === subscription.id ? subscription : item))
      : [...current.subscriptions, subscription];
    await saveSubscriptions(userId, subscriptions);
    return subscription;
  }
}

export async function deleteSubscriptionForUser(userId: string, id: string): Promise<void> {
  if (!isMockAuthEnabled() && isSupabaseEnabled()) {
    try {
      await deleteSubscriptionFromSupabase(id);
    } catch {
      // fallback local
    }
  }

  const current = await loadLiabilities(userId);
  await saveSubscriptions(
    userId,
    current.subscriptions.filter((item) => item.id !== id),
  );
}
