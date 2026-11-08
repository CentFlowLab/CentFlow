import type { SubscriptionPeriod, SubscriptionStatus } from './types';

const PERIODS_PER_YEAR: Record<SubscriptionPeriod, number> = {
  weekly: 52,
  monthly: 12,
  yearly: 1,
};

/** Custo anual exato, em unidades mínimas. Semanal conta 52 ocorrências. */
export function annualAmountMinor(period: SubscriptionPeriod, amountMinor: number): number {
  return amountMinor * PERIODS_PER_YEAR[period];
}

export type SubscriptionCost = {
  currency: string;
  /** Parte inteira do custo anual a dividir por 12. O resto fica só no anual. */
  monthlyMinor: number;
  yearlyMinor: number;
};

type CostInput = {
  status: SubscriptionStatus;
  currency: string;
  period: SubscriptionPeriod;
  amount: number;
};

/**
 * Soma só as subscrições ativas, uma linha por moeda. Mensal é a divisão inteira
 * do anual por 12; o anual não arredonda.
 */
export function activeSubscriptionCosts(items: readonly CostInput[]): SubscriptionCost[] {
  const yearly = new Map<string, number>();
  for (const item of items) {
    if (item.status !== 'active') continue;
    const next = (yearly.get(item.currency) ?? 0) + annualAmountMinor(item.period, item.amount);
    yearly.set(item.currency, next);
  }
  return [...yearly.keys()].sort().map((currency) => {
    const yearlyMinor = yearly.get(currency) ?? 0;
    return { currency, yearlyMinor, monthlyMinor: Math.trunc(yearlyMinor / 12) };
  });
}
