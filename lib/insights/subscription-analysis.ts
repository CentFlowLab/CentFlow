import type { Subscription } from '@/lib/domain/assets.types';
import { monthlySubscriptionTotal } from '@/lib/domain/financial/centflow-score';

export type SubscriptionAnalysis = {
  monthlyTotal: number;
  annualTotal: number;
  variation3Months: number | null;
  byCategory: Array<{ label: string; amount: number; percent: number }>;
  items: Array<{
    id: string;
    name: string;
    monthlyAmount: number;
    nextRenewal?: string;
    priceIncreased?: boolean;
  }>;
};

function toMonthlyAmount(sub: Subscription): number {
  const interval = sub.billingInterval ?? 'monthly';
  if (interval === 'annual') return sub.amount / 12;
  if (interval === 'quarterly') return sub.amount / 3;
  return sub.amount;
}

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (/netflix|spotify|disney|hbo|prime|streaming|youtube/.test(n)) return 'Streaming';
  if (/adobe|microsoft|notion|software|cloud|github|apple/.test(n)) return 'Software';
  return 'Outros';
}

export function computeSubscriptionAnalysis(
  subscriptions: Subscription[],
): SubscriptionAnalysis | null {
  if (subscriptions.length === 0) return null;

  const monthlyTotal = monthlySubscriptionTotal(subscriptions);
  const byCat = new Map<string, number>();

  const items = subscriptions.map((sub) => {
    const monthlyAmount = toMonthlyAmount(sub);
    const cat = inferCategory(sub.name);
    byCat.set(cat, (byCat.get(cat) ?? 0) + monthlyAmount);
    return {
      id: sub.id,
      name: sub.name,
      monthlyAmount,
      nextRenewal: sub.renewsAt,
      priceIncreased: false,
    };
  });

  const byCategory = [...byCat.entries()]
    .map(([label, amount]) => ({
      label,
      amount,
      percent: monthlyTotal > 0 ? (amount / monthlyTotal) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    variation3Months: null,
    byCategory,
    items: items.sort((a, b) => b.monthlyAmount - a.monthlyAmount),
  };
}
