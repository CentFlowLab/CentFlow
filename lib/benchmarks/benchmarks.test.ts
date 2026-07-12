import assert from 'node:assert/strict';
import test from 'node:test';

import type { Transaction } from '@/lib/domain/transaction.types';
import { resolveIncomeBucketKey } from '@/lib/benchmarks/income-buckets';
import { compareUserSpendingToBenchmarks } from '@/lib/benchmarks/compare-spending-benchmark';
import type { SpendingBenchmark } from '@/lib/benchmarks/types';

test('resolveIncomeBucketKey — faixas largas', () => {
  assert.equal(resolveIncomeBucketKey(850), '0-1000');
  assert.equal(resolveIncomeBucketKey(1200), '1000-1500');
  assert.equal(resolveIncomeBucketKey(5200), '5000+');
});

test('compareUserSpendingToBenchmarks — mensagem neutra e omite sem benchmark', () => {
  const now = new Date('2026-06-15T12:00:00');
  const transactions: Transaction[] = [
    {
      id: '1',
      type: 'expense',
      amount: 220,
      category: 'food',
      categoryLabel: 'Alimentação',
      date: '2026-06-10',
      currency: 'EUR',
    },
  ];

  const benchmarks: SpendingBenchmark[] = [
    {
      incomeBucketKey: '1500-2000',
      incomeBucketLabel: '1 500 – 2 000 €',
      category: 'food',
      region: 'PT',
      meanAmount: 180,
      medianAmount: 175,
      sampleCount: 42,
      periodMonthKey: '2026-06',
      computedAt: now.toISOString(),
    },
  ];

  const comparisons = compareUserSpendingToBenchmarks(transactions, benchmarks, now);
  assert.equal(comparisons.length, 1);
  assert.match(comparisons[0].message, /Gastas/);
  assert.match(comparisons[0].message, /175/);
  assert.doesNotMatch(comparisons[0].message, /demais|culpa|devias/i);
});
