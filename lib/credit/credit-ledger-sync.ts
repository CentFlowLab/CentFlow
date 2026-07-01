import type { Credit } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';
import {
  applyCreditBalanceDelta,
  creditBalanceDeltaForTransaction,
} from '@/lib/domain/financial/credit-cards';
import {
  fetchLiabilitiesForUser,
  saveCreditForUser,
} from '@/lib/liabilities/liabilities.service';

export async function syncCreditBalanceFromTransaction(
  userId: string,
  transaction: Pick<Transaction, 'type' | 'amount' | 'creditId'>,
  direction: 'apply' | 'reverse',
): Promise<void> {
  if (!transaction.creditId) return;

  const delta = creditBalanceDeltaForTransaction(transaction, direction);
  if (delta === 0) return;

  const liabilities = await fetchLiabilitiesForUser(userId);
  const credit = liabilities.credits.find((item) => item.id === transaction.creditId);
  if (!credit) return;

  const updated = applyCreditBalanceDelta(credit, delta);
  await saveCreditForUser(userId, updated);
}

export async function getCreditForUser(
  userId: string,
  creditId: string,
): Promise<Credit | null> {
  const liabilities = await fetchLiabilitiesForUser(userId);
  return liabilities.credits.find((item) => item.id === creditId) ?? null;
}
