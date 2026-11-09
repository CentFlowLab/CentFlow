import { WEALTH_LIABILITY_TYPES, type WealthItem, type WealthType } from './types';

export function isLiabilityType(type: WealthType): boolean {
  return (WEALTH_LIABILITY_TYPES as readonly string[]).includes(type);
}

export type WealthTotals = {
  currency: string;
  assets: number;
  liabilities: number;
  /** Bens menos dívidas, sem os saldos das contas. */
  net: number;
};

/** Totais por moeda; nunca mistura moedas. */
export function wealthTotals(items: readonly WealthItem[]): WealthTotals[] {
  const byCurrency = new Map<string, WealthTotals>();
  for (const item of items) {
    const totals = byCurrency.get(item.currency) ?? {
      currency: item.currency,
      assets: 0,
      liabilities: 0,
      net: 0,
    };
    if (isLiabilityType(item.type)) totals.liabilities += item.amount;
    else totals.assets += item.amount;
    totals.net = totals.assets - totals.liabilities;
    byCurrency.set(item.currency, totals);
  }
  return [...byCurrency.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
