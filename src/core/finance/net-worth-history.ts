import type { CurrencyCode } from '../money';
import { monthRange, type CalendarDate, type MonthKey } from './dates';
import { isLiabilityType } from './wealth';
import type { AccountType, Id, WealthItem, WealthItemInput, WealthValuation } from './types';

/** Avaliações anteriores guardadas por bem (as mais recentes ficam). */
export const MAX_VALUATIONS = 120;

/**
 * Histórico depois de gravar `next` sobre `before` (ADR-046):
 * - valor ou data diferentes: a avaliação anterior entra no histórico;
 * - a mesma data: é uma correção, a anterior não fica;
 * - outra moeda: os valores deixam de ser comparáveis e o histórico recomeça.
 */
export function recordValuation(
  before: Pick<WealthItem, 'amount' | 'currency' | 'valuedOn' | 'valueHistory'>,
  next: Pick<WealthItemInput, 'amount' | 'currency' | 'valuedOn'>,
): WealthValuation[] {
  if (next.currency !== before.currency) return [];
  const unchanged = next.amount === before.amount && next.valuedOn === before.valuedOn;
  if (unchanged || next.valuedOn === before.valuedOn) return [...before.valueHistory];
  const kept = before.valueHistory.filter((point) => point.valuedOn !== before.valuedOn);
  const history = [...kept, { amount: before.amount, valuedOn: before.valuedOn }]
    // Uma data nova anterior às guardadas também é válida: fica tudo por ordem.
    .filter((point) => point.valuedOn !== next.valuedOn)
    .sort((a, b) => (a.valuedOn < b.valuedOn ? -1 : a.valuedOn > b.valuedOn ? 1 : 0));
  return keepOrigin(history);
}

/** Acima do limite, saem as mais antigas, exceto a primeira (o valor inicial de uma dívida). */
function keepOrigin(history: WealthValuation[]): WealthValuation[] {
  if (history.length <= MAX_VALUATIONS) return history;
  return [history[0]!, ...history.slice(-(MAX_VALUATIONS - 1))];
}

/**
 * Põe `origin` como primeira avaliação: as que não forem posteriores a ela saem (ADR-052).
 * Quem chama garante que a origem é anterior à avaliação atual.
 */
export function withOrigin(
  history: readonly WealthValuation[],
  origin: WealthValuation | undefined,
): WealthValuation[] {
  if (!origin) return [...history];
  return keepOrigin([
    { amount: origin.amount, valuedOn: origin.valuedOn },
    ...history.filter((point) => point.valuedOn > origin.valuedOn),
  ]);
}

export type LiabilityProgress = {
  /** Valor inicial (primeira avaliação). */
  original: number;
  originalOn: CalendarDate;
  /** Já abatido: inicial − atual (nunca negativo). */
  paid: number;
  /** 0 a 1. */
  ratio: number;
};

/** Quanto de uma dívida já foi pago, a partir da primeira avaliação; `null` sem histórico. */
export function liabilityProgress(
  item: Pick<WealthItem, 'type' | 'amount' | 'valueHistory'> & { closedOn?: CalendarDate | null },
): LiabilityProgress | null {
  if (!isLiabilityType(item.type)) return null;
  const first = item.valueHistory[0];
  if (!first || first.amount <= 0) return null;
  // Paga: já não se deve nada, mesmo que o último valor guardado seja o anterior.
  const paid = item.closedOn ? first.amount : Math.max(first.amount - item.amount, 0);
  return {
    original: first.amount,
    originalOn: first.valuedOn,
    paid,
    ratio: Math.min(paid / first.amount, 1),
  };
}

/** Valor de um bem num dia: a avaliação mais recente até esse dia; `null` antes da primeira. */
export function valueOn(
  item: Pick<WealthItem, 'amount' | 'valuedOn' | 'valueHistory'>,
  date: CalendarDate,
): number | null {
  const points = [...item.valueHistory, { amount: item.amount, valuedOn: item.valuedOn }];
  let found: number | null = null;
  let foundOn = '';
  for (const point of points) {
    if (point.valuedOn <= date && point.valuedOn >= foundOn) {
      found = point.amount;
      foundOn = point.valuedOn;
    }
  }
  return found;
}

export type AccountSnapshotInput = {
  id: Id;
  type: AccountType;
  currency: string;
  initialBalance: number;
  /** Primeiro dia em que a conta conta: o dia em que foi criada ou o do primeiro movimento. */
  since: CalendarDate;
};

/** Variação de saldo de uma conta num mês (rendimentos − despesas ± transferências). */
export type AccountMonthFlow = { accountId: Id; month: MonthKey; net: number };

export type NetWorthPoint = {
  month: MonthKey;
  /** Saldo das contas no último dia do mês. */
  accounts: number;
  assets: number;
  liabilities: number;
  /** Contas + bens − dívidas. */
  netWorth: number;
};

/**
 * Património líquido no fim de cada mês, numa moeda. As contas vêm dos movimentos (exato e sempre
 * coerente com correções); os bens e dívidas, do histórico das avaliações. Um bem só conta a partir
 * da primeira avaliação; um mês antes de qualquer dado fica de fora.
 */
export function netWorthHistory(input: {
  months: readonly MonthKey[];
  currency: CurrencyCode;
  accounts: readonly AccountSnapshotInput[];
  flows: readonly AccountMonthFlow[];
  wealth: readonly (Pick<
    WealthItem,
    'type' | 'currency' | 'amount' | 'valuedOn' | 'valueHistory'
  > & { closedOn?: CalendarDate | null })[];
}): NetWorthPoint[] {
  const accounts = input.accounts.filter((account) => account.currency === input.currency);
  const wealth = input.wealth.filter((item) => item.currency === input.currency);
  const points: NetWorthPoint[] = [];
  for (const month of input.months) {
    const end = monthRange(month).end;
    let accountTotal = 0;
    let anyAccount = false;
    for (const account of accounts) {
      if (account.since > end) continue;
      anyAccount = true;
      let balance = account.initialBalance;
      for (const flow of input.flows) {
        if (flow.accountId === account.id && flow.month <= month) balance += flow.net;
      }
      accountTotal += balance;
    }
    let assets = 0;
    let liabilities = 0;
    let anyWealth = false;
    for (const item of wealth) {
      // Vendido ou pago antes do fim do mês: já não conta nesse mês.
      if (item.closedOn && item.closedOn <= end) continue;
      const value = valueOn(item, end);
      if (value === null) continue;
      anyWealth = true;
      if (isLiabilityType(item.type)) liabilities += value;
      else assets += value;
    }
    if (!anyAccount && !anyWealth) continue;
    points.push({
      month,
      accounts: accountTotal,
      assets,
      liabilities,
      netWorth: accountTotal + assets - liabilities,
    });
  }
  return points;
}
