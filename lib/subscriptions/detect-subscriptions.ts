import type { Subscription, SubscriptionBillingInterval } from '@/lib/domain/assets.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import { subscriptionToMonthlyAmount } from '@/lib/subscriptions/subscription-utils';

export type DetectedSubscription = {
  id: string;
  name: string;
  amount: number;
  billingInterval: SubscriptionBillingInterval;
  transactionIds: string[];
  confidence: 'high' | 'medium';
  lastDate: string;
};

const SUBSCRIPTION_KEYWORDS = [
  'netflix',
  'spotify',
  'disney',
  'amazon prime',
  'apple',
  'icloud',
  'google',
  'microsoft',
  'office',
  'gym',
  'ginásio',
  'ginasio',
  'subscri',
  'subscription',
  'prime video',
  'hbo',
  'canal+',
  'youtube',
  'adobe',
  'notion',
  'dropbox',
  'annual',
  'anual',
  'trimestral',
  'quarterly',
];

type IntervalMatch = {
  interval: SubscriptionBillingInterval;
  matches: number;
};

const INTERVAL_RANGES: Array<{
  interval: SubscriptionBillingInterval;
  minDays: number;
  maxDays: number;
}> = [
  { interval: 'monthly', minDays: 25, maxDays: 38 },
  { interval: 'quarterly', minDays: 85, maxDays: 100 },
  { interval: 'annual', minDays: 350, maxDays: 380 },
];

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function amountsMatch(a: number, b: number): boolean {
  const tolerance = Math.max(0.5, a * 0.08);
  return Math.abs(a - b) <= tolerance;
}

function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return ms / (1000 * 60 * 60 * 24);
}

function isLikelySubscriptionLabel(label: string): boolean {
  const normalized = normalizeLabel(label);
  return SUBSCRIPTION_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function detectInterval(recurring: Transaction[]): IntervalMatch | null {
  const counts = new Map<SubscriptionBillingInterval, number>();

  for (let i = 1; i < recurring.length; i += 1) {
    const gap = daysBetween(recurring[i].date, recurring[i - 1].date);
    for (const range of INTERVAL_RANGES) {
      if (gap >= range.minDays && gap <= range.maxDays) {
        counts.set(range.interval, (counts.get(range.interval) ?? 0) + 1);
      }
    }
  }

  let best: IntervalMatch | null = null;
  for (const [interval, matches] of counts) {
    if (!best || matches > best.matches) {
      best = { interval, matches };
    }
  }

  return best;
}

function matchesExistingSubscription(
  name: string,
  amount: number,
  interval: SubscriptionBillingInterval,
  existing: Subscription[],
): boolean {
  const normalized = normalizeLabel(name);
  const monthlyAmount = subscriptionToMonthlyAmount(amount, interval);

  return existing.some((sub) => {
    const subName = normalizeLabel(sub.name);
    const subMonthly = subscriptionToMonthlyAmount(sub.amount, sub.billingInterval ?? 'monthly');
    return (
      (subName.includes(normalized) || normalized.includes(subName)) &&
      amountsMatch(subMonthly, monthlyAmount)
    );
  });
}

export function detectSubscriptionsFromTransactions(
  transactions: Transaction[],
  existing: Subscription[],
  dismissedIds: string[] = [],
): DetectedSubscription[] {
  const expenses = transactions.filter((tx) => tx.type === 'expense');
  const groups = new Map<string, Transaction[]>();

  for (const tx of expenses) {
    const label =
      tx.description?.trim() ||
      tx.categoryLabel?.trim() ||
      tx.category?.trim() ||
      'Movimento';
    const key = normalizeLabel(label);
    if (!key) continue;

    const bucket = groups.get(key) ?? [];
    bucket.push(tx);
    groups.set(key, bucket);
  }

  const detected: DetectedSubscription[] = [];

  for (const [key, group] of groups) {
    if (group.length < 2) continue;

    const sorted = [...group].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const reference = sorted[sorted.length - 1];
    const recurring = sorted.filter((tx) => amountsMatch(tx.amount, reference.amount));

    if (recurring.length < 2) continue;

    const intervalMatch = detectInterval(recurring);
    if (!intervalMatch || intervalMatch.matches < 1) continue;

    const keywordHit = isLikelySubscriptionLabel(key);
    const confidence: 'high' | 'medium' =
      intervalMatch.matches >= 1 && keywordHit ? 'high' : 'medium';

    const displayName =
      reference.description?.trim() ||
      reference.categoryLabel?.trim() ||
      reference.category?.trim() ||
      key;

    if (
      matchesExistingSubscription(
        displayName,
        reference.amount,
        intervalMatch.interval,
        existing,
      )
    ) {
      continue;
    }

    const id = `detected-${key}-${reference.amount.toFixed(2)}-${intervalMatch.interval}`;
    if (dismissedIds.includes(id)) continue;

    detected.push({
      id,
      name: displayName,
      amount: reference.amount,
      billingInterval: intervalMatch.interval,
      transactionIds: recurring.map((tx) => tx.id),
      confidence,
      lastDate: reference.date,
    });
  }

  return detected.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return a.confidence === 'high' ? -1 : 1;
    }
    return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
  });
}
