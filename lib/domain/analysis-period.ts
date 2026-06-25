import type { SpendingCategorySlice } from '@/lib/domain/analysis.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import { isTransactionOccurred, parseTransactionDate } from '@/lib/domain/transaction-date.utils';

export type AnalysisPeriodKey = 'week' | 'month' | 'quarter' | 'year';

export type AnalysisPeriodOption = {
  key: AnalysisPeriodKey;
  label: string;
  days: number;
  /** Número de buckets temporais a mostrar no gráfico de barras. */
  buckets: number;
  /** Duração de cada bucket em dias. */
  bucketDays: number;
};

export const ANALYSIS_PERIOD_OPTIONS: AnalysisPeriodOption[] = [
  { key: 'week', label: 'Semana', days: 7, buckets: 7, bucketDays: 1 },
  { key: 'month', label: 'Mês', days: 30, buckets: 4, bucketDays: 7 },
  { key: 'quarter', label: '3 Meses', days: 90, buckets: 3, bucketDays: 30 },
  { key: 'year', label: 'Ano', days: 365, buckets: 12, bucketDays: 30 },
];

export function getPeriodOption(key: AnalysisPeriodKey): AnalysisPeriodOption {
  return ANALYSIS_PERIOD_OPTIONS.find((option) => option.key === key) ?? ANALYSIS_PERIOD_OPTIONS[1];
}

function isWithinLastDays(date: string, days: number, asOf: Date): boolean {
  if (!isTransactionOccurred(date, asOf)) return false;
  const target = parseTransactionDate(date);
  const start = new Date(asOf);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return target >= start;
}

/** Despesas agrupadas por categoria dentro do período seleccionado. */
export function computeSpendingByCategory(
  transactions: Transaction[],
  days: number,
  asOf: Date = new Date(),
): SpendingCategorySlice[] {
  const totals = new Map<string, SpendingCategorySlice>();

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (!isWithinLastDays(tx.date, days, asOf)) continue;
    const current = totals.get(tx.category) ?? {
      key: tx.category,
      label: tx.categoryLabel,
      amount: 0,
    };
    current.amount += tx.amount;
    totals.set(tx.category, current);
  }

  return [...totals.values()].sort((a, b) => b.amount - a.amount).slice(0, 6);
}

export type SpendingBucket = {
  key: string;
  label: string;
  amount: number;
};

/** Despesas por bucket temporal (para gráfico de barras), do mais antigo ao mais recente. */
export function computeSpendingBuckets(
  transactions: Transaction[],
  option: AnalysisPeriodOption,
  asOf: Date = new Date(),
): SpendingBucket[] {
  const buckets: SpendingBucket[] = [];
  const today = new Date(asOf);
  today.setHours(23, 59, 59, 999);

  for (let i = option.buckets - 1; i >= 0; i -= 1) {
    const end = new Date(today);
    end.setDate(end.getDate() - i * option.bucketDays);
    const start = new Date(end);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (option.bucketDays - 1));

    let amount = 0;
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const target = parseTransactionDate(tx.date);
      if (target >= start && target <= end) {
        amount += tx.amount;
      }
    }

    buckets.push({
      key: `${start.toISOString().slice(0, 10)}`,
      label: bucketLabel(option, end),
      amount,
    });
  }

  return buckets;
}

function bucketLabel(option: AnalysisPeriodOption, end: Date): string {
  if (option.key === 'week') {
    return new Intl.DateTimeFormat('pt-PT', { weekday: 'narrow' }).format(end).toUpperCase();
  }
  if (option.key === 'year') {
    return new Intl.DateTimeFormat('pt-PT', { month: 'narrow' }).format(end).toUpperCase();
  }
  if (option.key === 'quarter') {
    return new Intl.DateTimeFormat('pt-PT', { month: 'short' }).format(end);
  }
  // Mês → semanas
  const day = end.getDate();
  return `${Math.max(1, Math.ceil(day / 7))}ª`;
}
