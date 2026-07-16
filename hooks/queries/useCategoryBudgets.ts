import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useFinancialEngineSnapshot } from '@/hooks/useFinancialEngineSnapshot';
import { queryKeys } from '@/lib/api/keys';
import {
  fetchCategoryBudgetsForUser,
  seedSuggestedCategoryBudgetsForUser,
  upsertCategoryBudgetForUser,
} from '@/lib/category-budgets/category-budgets.service';
import type { CategoryBudgetSource } from '@/lib/domain/category-budget.types';
import { selectCategoryBudgetStatus } from '@/lib/domain/financial/engine.selectors';
import type { Transaction } from '@/lib/domain/transaction.types';
import { useAuth } from '@/lib/auth';
import { scheduleFinancialRecalculation } from '@/lib/domain/financial/engine.runner';

import { useTransactions } from './useTransactions';

export function useCategoryBudgets() {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? '';
  const { data: transactions = [] } = useTransactions('all');
  const seedStartedRef = useRef(false);

  const query = useQuery({
    queryKey: queryKeys.categoryBudgets(userId),
    queryFn: () => fetchCategoryBudgetsForUser(userId),
    enabled: isAuthenticated && Boolean(userId),
    staleTime: 1000 * 60 * 2,
  });

  const seedMutation = useSeedSuggestedCategoryBudgets();

  useEffect(() => {
    if (!query.isSuccess || seedStartedRef.current) return;
    if ((query.data?.length ?? 0) > 0) return;
    if (transactions.length === 0) return;
    if (seedMutation.isPending) return;

    seedStartedRef.current = true;
    seedMutation.mutate(transactions);
  }, [query.isSuccess, query.data, transactions, seedMutation.isPending, seedMutation]);

  return query;
}

export function useUpsertCategoryBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: (input: {
      category: string;
      monthlyLimit: number;
      source?: CategoryBudgetSource;
    }) => upsertCategoryBudgetForUser(userId, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categoryBudgets(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
      scheduleFinancialRecalculation(queryClient, userId, {
        type: 'category_budget_updated',
        category: variables.category,
      });
    },
  });
}

export function useSeedSuggestedCategoryBudgets() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: (transactions: Transaction[]) =>
      seedSuggestedCategoryBudgetsForUser(userId, transactions),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categoryBudgets(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
    },
  });
}

/** Estados de orçamento por categoria — lê passo categoryBudgets do motor. */
export function useCategoryBudgetStatus(_asOf?: Date) {
  const budgetsQuery = useCategoryBudgets();
  const { engineResults, isLoading: engineLoading } = useFinancialEngineSnapshot();

  const statuses = useMemo(
    () => selectCategoryBudgetStatus(engineResults ?? undefined),
    [engineResults],
  );

  return {
    budgets: budgetsQuery.data ?? [],
    statuses,
    isLoading: budgetsQuery.isLoading || engineLoading,
    isError: budgetsQuery.isError,
    error: budgetsQuery.error,
  };
}
