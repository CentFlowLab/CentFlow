import type { Subscription } from '@/lib/domain/assets.types';
import { resolveSubscriptionCancelUrl } from '@/lib/subscriptions/cancel-url-map';
import { subscriptionToMonthlyAmount } from '@/lib/subscriptions/subscription-utils';

import { parseFinancialDate } from './dates';

export const SUBSCRIPTION_REVIEW_INTERVAL_DAYS = 90;
export const SUBSCRIPTION_REVIEW_BEFORE_RENEWAL_DAYS = 14;
export const SUBSCRIPTION_REVIEW_RECENT_DAYS = 30;

function daysBetween(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function daysSinceSubscriptionReview(
  subscription: Subscription,
  asOf: Date = new Date(),
): number | null {
  if (!subscription.lastReviewedAt) return null;
  const reviewed = parseFinancialDate(subscription.lastReviewedAt);
  if (!reviewed) return null;
  return daysBetween(reviewed, asOf);
}

/** Subscrição precisa de revisão periódica ou antes de renovação próxima. */
export function isSubscriptionReviewDue(
  subscription: Subscription,
  asOf: Date = new Date(),
): boolean {
  const daysSince = daysSinceSubscriptionReview(subscription, asOf);
  if (daysSince === null) return true;

  if (subscription.renewsAt) {
    const renewal = parseFinancialDate(subscription.renewsAt);
    if (renewal) {
      const daysToRenewal = daysBetween(asOf, renewal);
      if (
        daysToRenewal >= 0 &&
        daysToRenewal <= SUBSCRIPTION_REVIEW_BEFORE_RENEWAL_DAYS &&
        daysSince >= SUBSCRIPTION_REVIEW_RECENT_DAYS
      ) {
        return true;
      }
    }
  }

  return daysSince >= SUBSCRIPTION_REVIEW_INTERVAL_DAYS;
}

export type SubscriptionReviewCandidate = {
  subscription: Subscription;
  cancelUrl: string | null;
  monthlyAmount: number;
  daysSinceReview: number | null;
  renewingSoon: boolean;
};

export function pickSubscriptionsNeedingReview(
  subscriptions: Subscription[],
  asOf: Date = new Date(),
): SubscriptionReviewCandidate[] {
  return subscriptions
    .filter((subscription) => isSubscriptionReviewDue(subscription, asOf))
    .map((subscription) => {
      const daysSince = daysSinceSubscriptionReview(subscription, asOf);
      let renewingSoon = false;
      if (subscription.renewsAt) {
        const renewal = parseFinancialDate(subscription.renewsAt);
        if (renewal) {
          const daysToRenewal = daysBetween(asOf, renewal);
          renewingSoon =
            daysToRenewal >= 0 && daysToRenewal <= SUBSCRIPTION_REVIEW_BEFORE_RENEWAL_DAYS;
        }
      }

      return {
        subscription,
        cancelUrl: resolveSubscriptionCancelUrl(subscription.name),
        monthlyAmount: subscriptionToMonthlyAmount(
          subscription.amount,
          subscription.billingInterval ?? 'monthly',
        ),
        daysSinceReview: daysSince,
        renewingSoon,
      };
    })
    .sort((a, b) => {
      if (a.renewingSoon !== b.renewingSoon) return a.renewingSoon ? -1 : 1;
      const daysA = a.daysSinceReview ?? Number.MAX_SAFE_INTEGER;
      const daysB = b.daysSinceReview ?? Number.MAX_SAFE_INTEGER;
      return daysB - daysA;
    });
}
