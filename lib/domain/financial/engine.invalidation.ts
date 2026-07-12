import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { invalidateAssetsQueries, invalidateTransactionQueries } from '@/lib/api/invalidate-queries';

/** Invalida todas as queries derivadas após o motor financeiro terminar. */
export function invalidateFinancialDerivedQueries(
  queryClient: QueryClient,
  userId: string,
): void {
  invalidateTransactionQueries(queryClient);
  invalidateAssetsQueries(queryClient);

  void queryClient.invalidateQueries({ queryKey: queryKeys.liabilities(userId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.categoryBudgets(userId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.goalContributions });
  void queryClient.invalidateQueries({ queryKey: queryKeys.loanPayments });
}
