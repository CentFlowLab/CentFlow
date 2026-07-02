import type { Subscription, SubscriptionBillingInterval } from '@/lib/domain/assets.types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { getMonthKey } from './dates';

export type SubscriptionPaymentStatus = 'paid' | 'overdue' | 'pending';

export type SubscriptionPaymentUiState = {
  status: SubscriptionPaymentStatus;
  actionLabel: string;
  paidThisCycle: boolean;
  disabled: boolean;
};

/** Mês de referência do ciclo de cobrança (YYYY-MM). */
export function getSubscriptionBillingMonthKey(
  subscription: Pick<Subscription, 'renewsAt'>,
  referenceDate: Date = new Date(),
): string {
  if (subscription.renewsAt) {
    return subscription.renewsAt.slice(0, 7);
  }
  return getMonthKey(referenceDate);
}

export function isSubscriptionPaidInCycle(
  subscription: Subscription,
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): boolean {
  const cycleKey = getSubscriptionBillingMonthKey(subscription, referenceDate);
  return transactions.some(
    (tx) =>
      tx.recurringId === subscription.id &&
      (tx.type === 'expense' || tx.type === 'credit_card_purchase') &&
      tx.date.slice(0, 7) === cycleKey,
  );
}

export function collectPaidSubscriptionIds(
  subscriptions: Subscription[],
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): Set<string> {
  const paid = new Set<string>();
  for (const subscription of subscriptions) {
    if (isSubscriptionPaidInCycle(subscription, transactions, referenceDate)) {
      paid.add(subscription.id);
    }
  }
  return paid;
}

export function getSubscriptionPaymentUiState(
  subscription: Subscription,
  transactions: Transaction[],
  asOf: Date = new Date(),
): SubscriptionPaymentUiState {
  const paidThisCycle = isSubscriptionPaidInCycle(subscription, transactions, asOf);

  if (paidThisCycle) {
    return {
      status: 'paid',
      actionLabel: 'Pago',
      paidThisCycle: true,
      disabled: true,
    };
  }

  if (subscription.renewsAt) {
    const renewDate = new Date(`${subscription.renewsAt.slice(0, 10)}T12:00:00`);
    const today = new Date(asOf);
    today.setHours(12, 0, 0, 0);
    if (renewDate.getTime() < today.getTime()) {
      return {
        status: 'overdue',
        actionLabel: 'Pagar agora',
        paidThisCycle: false,
        disabled: false,
      };
    }
  }

  return {
    status: 'pending',
    actionLabel: 'Marcar como pago',
    paidThisCycle: false,
    disabled: false,
  };
}

function addInterval(date: Date, interval: SubscriptionBillingInterval): Date {
  const next = new Date(date);
  if (interval === 'quarterly') {
    next.setMonth(next.getMonth() + 3);
  } else if (interval === 'annual') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

/** Avança a data de renovação após pagamento confirmado. */
export function advanceSubscriptionRenewalDate(
  subscription: Pick<Subscription, 'renewsAt' | 'billingInterval'>,
  paidAt: string,
): string {
  const interval = subscription.billingInterval ?? 'monthly';
  const paid = new Date(`${paidAt.slice(0, 10)}T12:00:00`);
  const base = subscription.renewsAt
    ? new Date(`${subscription.renewsAt.slice(0, 10)}T12:00:00`)
    : paid;

  const from =
    !Number.isNaN(paid.getTime()) && !Number.isNaN(base.getTime()) && paid > base
      ? paid
      : base;

  if (Number.isNaN(from.getTime())) {
    return addInterval(new Date(), interval).toISOString().slice(0, 10);
  }

  return addInterval(from, interval).toISOString().slice(0, 10);
}
