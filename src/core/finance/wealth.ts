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
    // Vendido ou pago: já não faz parte do património atual (fica no histórico).
    if (item.closedOn) continue;
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

export type NetWorthSummary = {
  currency: string;
  /** Dinheiro nas contas (sem cartões de crédito). */
  available: number;
  /** O que se deve nos cartões de crédito (positivo). */
  cardDebt: number;
  /** Investimentos e planos de reforma do património. */
  invested: number;
  /** Bens do património (inclui o investido). */
  assets: number;
  /** Dívida total: cartões + dívidas do património. */
  debt: number;
  /** Contas + bens − dívidas. */
  net: number;
};

/**
 * Resumo do património numa só moeda (as outras moedas não se somam: ficam fora, sem converter).
 * Cada valor conta uma vez: o saldo dos cartões é dívida, não dinheiro disponível.
 */
export function netWorthSummary(
  accounts: readonly { type: string; currency: string; balance: number }[],
  items: readonly WealthItem[],
  currency: string,
): NetWorthSummary {
  let available = 0;
  let cardDebt = 0;
  for (const account of accounts) {
    if (account.currency !== currency) continue;
    if (account.type === 'card') cardDebt += Math.max(0, -account.balance);
    else available += account.balance;
  }
  // Um cartão com saldo a favor (pagou a mais) também é dinheiro da pessoa.
  for (const account of accounts) {
    if (account.currency === currency && account.type === 'card' && account.balance > 0) {
      available += account.balance;
    }
  }
  let assets = 0;
  let invested = 0;
  let liabilities = 0;
  for (const item of items) {
    if (item.closedOn || item.currency !== currency) continue;
    if (isLiabilityType(item.type)) liabilities += item.amount;
    else {
      assets += item.amount;
      if (item.type === 'investment' || item.type === 'retirement') invested += item.amount;
    }
  }
  const debt = cardDebt + liabilities;
  return { currency, available, cardDebt, invested, assets, debt, net: available + assets - debt };
}
