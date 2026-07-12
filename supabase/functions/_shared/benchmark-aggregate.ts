/** Lógica de agregação — cópia edge-safe (sem imports React Native). */

import {
  incomeBucketLabel,
  mean,
  median,
  MIN_BENCHMARK_SAMPLE_COUNT,
  resolveIncomeBucketKey,
} from './income-buckets.ts';

export type BenchmarkAggregateRow = {
  income_bucket_key: string;
  income_bucket_label: string;
  category: string;
  region: string;
  mean_amount: number;
  median_amount: number;
  sample_count: number;
  period_month_key: string;
};

type TxRow = {
  type: string;
  amount: number;
  category: string;
  transaction_date: string;
  credit_id?: string | null;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function isBudgetExpense(tx: TxRow): boolean {
  if (tx.type === 'credit_card_purchase') return true;
  if (tx.type === 'expense' && tx.credit_id) return true;
  return tx.type === 'expense';
}

function isIncome(tx: TxRow): boolean {
  return tx.type === 'income';
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function getPreviousCompleteMonthKeys(count: number, asOf: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(asOf.getFullYear(), asOf.getMonth() - 1, 15);
  for (let i = 0; i < count; i += 1) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    keys.push(`${year}-${month}`);
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return keys;
}

function sumInMonth(transactions: TxRow[], month: string, predicate: (tx: TxRow) => boolean): number {
  return roundMoney(
    transactions
      .filter((tx) => monthKey(tx.transaction_date) === month && predicate(tx))
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
  );
}

function categorySpendInMonth(transactions: TxRow[], month: string): Map<string, number> {
  const totals = new Map<string, number>();
  for (const tx of transactions) {
    if (!isBudgetExpense(tx)) continue;
    if (monthKey(tx.transaction_date) !== month) continue;
    const current = totals.get(tx.category) ?? 0;
    totals.set(tx.category, roundMoney(current + Math.abs(tx.amount)));
  }
  return totals;
}

export function normalizeBenchmarkRegion(region?: string | null): string {
  const value = (region ?? 'PT').toLowerCase();
  if (value === 'portugal' || value === 'pt') return 'PT';
  if (value === 'brasil' || value === 'br') return 'BR';
  if (value === 'espanha' || value === 'es') return 'ES';
  return 'PT';
}

export type UserBenchmarkInput = {
  userId: string;
  region: string;
  transactions: TxRow[];
};

/**
 * Constrói perfis por utilizador opt-in e agrega por bucket/categoria.
 * Nunca expõe dados individuais — só devolve linhas com sample_count ≥ 30.
 */
export function buildBenchmarkAggregates(
  users: UserBenchmarkInput[],
  asOf: Date = new Date(),
): BenchmarkAggregateRow[] {
  const incomeMonths = getPreviousCompleteMonthKeys(3, asOf);
  const spendMonth = incomeMonths[0];

  const bucketCategoryValues = new Map<string, number[]>();

  for (const user of users) {
    const monthlyIncomes = incomeMonths.map((key) =>
      sumInMonth(user.transactions, key, isIncome),
    );
    const incomesWithValue = monthlyIncomes.filter((value) => value > 0);
    if (incomesWithValue.length < 2) continue;

    const incomeMedian = median(incomesWithValue);
    const bucketKey = resolveIncomeBucketKey(incomeMedian);
    if (!bucketKey) continue;

    const region = normalizeBenchmarkRegion(user.region);
    const spends = categorySpendInMonth(user.transactions, spendMonth);

    for (const [category, amount] of spends) {
      if (amount <= 0) continue;
      const groupKey = `${bucketKey}|${region}|${category}`;
      const list = bucketCategoryValues.get(groupKey) ?? [];
      list.push(amount);
      bucketCategoryValues.set(groupKey, list);
    }
  }

  const rows: BenchmarkAggregateRow[] = [];

  for (const [groupKey, values] of bucketCategoryValues) {
    if (values.length < MIN_BENCHMARK_SAMPLE_COUNT) continue;

    const [bucketKey, region, category] = groupKey.split('|');
    rows.push({
      income_bucket_key: bucketKey,
      income_bucket_label: incomeBucketLabel(bucketKey),
      category,
      region,
      mean_amount: roundMoney(mean(values)),
      median_amount: roundMoney(median(values)),
      sample_count: values.length,
      period_month_key: spendMonth,
    });
  }

  return rows.sort((a, b) => a.category.localeCompare(b.category));
}
