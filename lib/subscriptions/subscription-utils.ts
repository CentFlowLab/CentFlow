import type { SubscriptionBillingInterval } from '@/lib/domain/assets.types';

/** Converte valores de subscrição para equivalente mensal. */
export function subscriptionToMonthlyAmount(
  amount: number,
  interval: SubscriptionBillingInterval = 'monthly',
): number {
  if (interval === 'quarterly') return amount / 3;
  if (interval === 'annual') return amount / 12;
  return amount;
}

export type { SubscriptionBillingInterval };
