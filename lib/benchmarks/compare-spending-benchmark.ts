import { getCategoryLabel } from '@/lib/data/transaction-categories';
import type { Transaction } from '@/lib/domain/transaction.types';
import { getCurrentMonthRange } from '@/lib/domain/financial/dates';
import { formatMoney } from '@/lib/domain/financial/money';
import { groupTransactionsByCategory } from '@/lib/domain/financial/transactions';

import type { CategoryBenchmarkComparison, SpendingBenchmark } from './types';

export function buildCategoryBenchmarkMessage(
  categoryLabel: string,
  userAmount: number,
  peerMedian: number,
): string {
  return `Gastas ${formatMoney(userAmount)} em ${categoryLabel}; a mediana de pessoas com rendimento semelhante é ${formatMoney(peerMedian)}.`;
}

export function compareUserSpendingToBenchmarks(
  transactions: Transaction[],
  benchmarks: SpendingBenchmark[],
  asOf: Date = new Date(),
): CategoryBenchmarkComparison[] {
  const { monthKey } = getCurrentMonthRange(asOf);
  const period = { kind: 'month' as const, monthKey, asOf };
  const userByCategory = new Map(
    groupTransactionsByCategory(transactions, period).map((item) => [item.key, item]),
  );

  const comparisons: CategoryBenchmarkComparison[] = [];

  for (const benchmark of benchmarks) {
    const userSlice = userByCategory.get(benchmark.category);
    if (!userSlice || userSlice.amount <= 0) continue;

    comparisons.push({
      category: benchmark.category,
      categoryLabel: getCategoryLabel(benchmark.category, 'expense'),
      userAmount: userSlice.amount,
      peerMedianAmount: benchmark.medianAmount,
      peerMeanAmount: benchmark.meanAmount,
      sampleCount: benchmark.sampleCount,
      message: buildCategoryBenchmarkMessage(
        getCategoryLabel(benchmark.category, 'expense'),
        userSlice.amount,
        benchmark.medianAmount,
      ),
    });
  }

  return comparisons.sort((a, b) => b.userAmount - a.userAmount);
}
