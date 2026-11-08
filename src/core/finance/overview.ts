import { DEFAULT_CURRENCY, type CurrencyCode } from '../money';
import { monthsEndingAt, type MonthKey } from './dates';
import {
  expensesByCategory,
  monthlyTotals,
  summarize,
  type CategoryShare,
  type MonthTotals,
  type PeriodSummary,
} from './summary';
import type { Id } from './types';

/** Totais agregados por mês/moeda/tipo/categoria (ver `EntryRepository.aggregate`). */
export type MonthlyAggregate = {
  month: MonthKey;
  currency: CurrencyCode;
  type: 'income' | 'expense';
  categoryId: Id;
  amount: number;
};

/**
 * Moeda principal para os totais: a mais usada nas contas (desempate pela ordem das contas).
 * Sem contas, usa a moeda predefinida.
 */
export function pickPrimaryCurrency(
  accountCurrencies: readonly CurrencyCode[],
  fallback: CurrencyCode = DEFAULT_CURRENCY,
): CurrencyCode {
  const counts = new Map<CurrencyCode, number>();
  for (const currency of accountCurrencies) counts.set(currency, (counts.get(currency) ?? 0) + 1);
  let best: CurrencyCode | null = null;
  let bestCount = 0;
  for (const [currency, count] of counts) {
    if (count > bestCount) {
      best = currency;
      bestCount = count;
    }
  }
  return best ?? fallback;
}

export type MonthlyOverview = {
  month: MonthKey;
  currency: CurrencyCode;
  summary: PeriodSummary;
  categories: CategoryShare[];
  trend: MonthTotals[];
};

/** Resumo de um mês e evolução dos meses anteriores, numa única moeda. */
export function buildMonthlyOverview(
  aggregates: readonly MonthlyAggregate[],
  {
    month,
    currency,
    trendLength,
  }: { month: MonthKey; currency: CurrencyCode; trendLength: number },
): MonthlyOverview {
  const entries = aggregates
    .filter((row) => row.currency === currency)
    .map((row) => ({
      type: row.type,
      amount: row.amount,
      categoryId: row.categoryId,
      date: `${row.month}-01`,
    }));
  const ofMonth = entries.filter((entry) => entry.date.startsWith(month));
  return {
    month,
    currency,
    summary: summarize(ofMonth),
    categories: expensesByCategory(ofMonth),
    trend: monthlyTotals(entries, monthsEndingAt(month, trendLength)),
  };
}
