import { fetchTransactions } from '@/lib/api/services/transaction.service';
import { isMockAuthEnabled } from '@/lib/auth';
import {
  buildCategorySpendAnomalyMessage,
  evaluateCategorySpendAnomaly,
  isCategorySpendAlertCandidate,
} from '@/lib/domain/financial/category-spend-anomaly';
import type { Transaction } from '@/lib/domain/transaction.types';
import {
  ensureLocalNotificationPermissions,
  presentImmediateLocalNotification,
} from '@/lib/notifications/local-notifications';
import { fetchUserPreferences } from '@/lib/preferences/preferences.service';
import { getSupabaseClient, isSupabaseEnabled } from '@/lib/supabase';

async function resolveUserId(): Promise<string | null> {
  if (isMockAuthEnabled()) return 'mock-user-1';
  if (!isSupabaseEnabled()) return null;

  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Verifica e notifica gasto anómalo — nunca bloqueia o fluxo principal.
 * A transacção já deve estar persistida antes de chamar.
 */
export async function checkCategorySpendAnomalyForTransaction(
  transaction: Transaction,
): Promise<void> {
  try {
    if (!isCategorySpendAlertCandidate(transaction)) return;

    const userId = await resolveUserId();
    if (!userId) return;

    const preferences = await fetchUserPreferences(userId);
    if (!preferences.pushNotifications || !preferences.categorySpendAlerts) return;

    const transactions = await fetchTransactions('all');
    const evaluation = evaluateCategorySpendAnomaly(
      transaction.amount,
      transaction.category,
      transactions,
      {
        thresholdMultiplier: preferences.categorySpendAlertThreshold,
        excludeTransactionId: transaction.id,
      },
    );

    if (!evaluation) return;

    const granted = await ensureLocalNotificationPermissions();
    if (!granted) return;

    await presentImmediateLocalNotification(
      'Gasto acima do habitual',
      buildCategorySpendAnomalyMessage(evaluation),
    );
  } catch {
    // Notificação é efeito secundário — falhas silenciosas.
  }
}

export async function checkCategorySpendAnomaliesForTransactions(
  candidates: Transaction[],
): Promise<void> {
  for (const transaction of candidates) {
    await checkCategorySpendAnomalyForTransaction(transaction);
  }
}

export function filterExpenseTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter(isCategorySpendAlertCandidate);
}

export function findNewTransactions(
  previous: Transaction[],
  current: Transaction[],
): Transaction[] {
  const previousIds = new Set(previous.map((tx) => tx.id));
  return current.filter((tx) => !previousIds.has(tx.id));
}
