import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { useAuth } from '@/lib/auth';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { SPENDING_BENCHMARKS_UI_ENABLED } from '@/lib/benchmarks/config';
import { resolveUserIncomeBucketKey } from '@/lib/benchmarks/resolve-user-income-bucket';
import { compareUserSpendingToBenchmarks } from '@/lib/benchmarks/compare-spending-benchmark';
import { fetchSpendingBenchmarks } from '@/lib/benchmarks/spending-benchmarks.service';
import type { CategoryBenchmarkComparison } from '@/lib/benchmarks/types';

export function useSpendingBenchmarkComparisons(): {
  comparisons: CategoryBenchmarkComparison[];
  isLoading: boolean;
  isActive: boolean;
} {
  const { isAuthenticated } = useAuth();
  const { data: transactions = [] } = useTransactions('all');
  const { data: preferences } = useUserPreferences();

  const incomeBucketKey = resolveUserIncomeBucketKey(transactions);
  const region = (preferences?.region ?? 'PT').toUpperCase().slice(0, 2);

  const enabled =
    SPENDING_BENCHMARKS_UI_ENABLED &&
    isAuthenticated &&
    Boolean(incomeBucketKey);

  const { data: benchmarks = [], isLoading } = useQuery({
    queryKey: queryKeys.spendingBenchmarks(incomeBucketKey ?? 'none', region),
    queryFn: () => fetchSpendingBenchmarks(incomeBucketKey!, region),
    enabled,
    staleTime: 1000 * 60 * 60 * 12,
  });

  const comparisons =
    enabled && benchmarks.length > 0
      ? compareUserSpendingToBenchmarks(transactions, benchmarks)
      : [];

  return {
    comparisons,
    isLoading: enabled && isLoading,
    isActive: enabled,
  };
}
