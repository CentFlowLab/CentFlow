/** Faixas largas de rendimento mensal — nunca valores exactos. */

export type IncomeBucket = {
  key: string;
  label: string;
  min: number;
  max: number | null;
};

export const INCOME_BUCKETS_EUR: IncomeBucket[] = [
  { key: '0-1000', label: '0 – 1 000 €', min: 0, max: 1000 },
  { key: '1000-1500', label: '1 000 – 1 500 €', min: 1000, max: 1500 },
  { key: '1500-2000', label: '1 500 – 2 000 €', min: 1500, max: 2000 },
  { key: '2000-2500', label: '2 000 – 2 500 €', min: 2000, max: 2500 },
  { key: '2500-3000', label: '2 500 – 3 000 €', min: 2500, max: 3000 },
  { key: '3000-4000', label: '3 000 – 4 000 €', min: 3000, max: 4000 },
  { key: '4000-5000', label: '4 000 – 5 000 €', min: 4000, max: 5000 },
  { key: '5000+', label: '5 000 € ou mais', min: 5000, max: null },
];

export const MIN_BENCHMARK_SAMPLE_COUNT = 30;

export function resolveIncomeBucketKey(monthlyIncome: number): string | null {
  if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0) return null;

  for (const bucket of INCOME_BUCKETS_EUR) {
    if (monthlyIncome >= bucket.min && (bucket.max === null || monthlyIncome < bucket.max)) {
      return bucket.key;
    }
  }

  return null;
}

export function incomeBucketLabel(key: string): string {
  return INCOME_BUCKETS_EUR.find((bucket) => bucket.key === key)?.label ?? key;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
