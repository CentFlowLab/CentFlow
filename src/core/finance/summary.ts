import { monthOf, type MonthKey } from './dates';
import type { Entry, Id } from './types';

type SummableEntry = Pick<Entry, 'type' | 'amount' | 'categoryId' | 'date'>;

export type PeriodSummary = {
  income: number;
  expense: number;
  /** Poupança líquida = rendimentos − despesas (pode ser negativa). */
  net: number;
  /** net / income; `null` quando não há rendimentos (taxa indefinida). */
  savingsRate: number | null;
};

/**
 * Resumo de um conjunto de movimentos na mesma moeda.
 * Transferências são ignoradas: movem dinheiro entre contas, não são rendimento nem despesa.
 */
export function summarize(entries: readonly SummableEntry[]): PeriodSummary {
  let income = 0;
  let expense = 0;
  for (const entry of entries) {
    if (entry.type === 'income') income += entry.amount;
    else if (entry.type === 'expense') expense += entry.amount;
  }
  const net = income - expense;
  return { income, expense, net, savingsRate: income > 0 ? net / income : null };
}

export type CategoryShare = {
  categoryId: Id;
  amount: number;
  /** Fração do total de despesas (0–1). */
  share: number;
};

/** Despesas agrupadas por categoria, da maior para a menor. */
export function expensesByCategory(entries: readonly SummableEntry[]): CategoryShare[] {
  const totals = new Map<Id, number>();
  let total = 0;
  for (const entry of entries) {
    if (entry.type !== 'expense' || !entry.categoryId) continue;
    totals.set(entry.categoryId, (totals.get(entry.categoryId) ?? 0) + entry.amount);
    total += entry.amount;
  }
  return [...totals.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount, share: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount || a.categoryId.localeCompare(b.categoryId));
}

export type MonthTotals = { month: MonthKey; income: number; expense: number; net: number };

/** Rendimentos e despesas por mês, para os meses pedidos (meses sem movimentos ficam a zero). */
export function monthlyTotals(
  entries: readonly SummableEntry[],
  months: readonly MonthKey[],
): MonthTotals[] {
  const byMonth = new Map<MonthKey, SummableEntry[]>(months.map((month) => [month, []]));
  for (const entry of entries) byMonth.get(monthOf(entry.date))?.push(entry);
  return months.map((month) => {
    const { income, expense, net } = summarize(byMonth.get(month) ?? []);
    return { month, income, expense, net };
  });
}
