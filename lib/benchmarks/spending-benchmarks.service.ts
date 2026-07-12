import { getSupabaseClient } from '@/lib/supabase/client';

import { MIN_BENCHMARK_SAMPLE_COUNT } from './config';
import type { SpendingBenchmark } from './types';

function mapBenchmark(row: Record<string, unknown>): SpendingBenchmark {
  return {
    incomeBucketKey: String(row.income_bucket_key),
    incomeBucketLabel: String(row.income_bucket_label),
    category: String(row.category),
    region: String(row.region),
    meanAmount: Number(row.mean_amount ?? 0),
    medianAmount: Number(row.median_amount ?? 0),
    sampleCount: Number(row.sample_count ?? 0),
    periodMonthKey: String(row.period_month_key),
    computedAt: String(row.computed_at),
  };
}

export async function fetchSpendingBenchmarks(
  incomeBucketKey: string,
  region = 'PT',
): Promise<SpendingBenchmark[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('spending-benchmarks', {
    body: { action: 'list_benchmarks', incomeBucketKey, region },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));

  const rows = (data?.benchmarks ?? []) as Record<string, unknown>[];
  return rows
    .map(mapBenchmark)
    .filter((item) => item.sampleCount >= MIN_BENCHMARK_SAMPLE_COUNT);
}
