import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import type {
  CreateGoalContributionInput,
  CreateGoalWithdrawalInput,
  GoalContribution,
} from '@/lib/domain/goal-contribution.types';
import { useAuth } from '@/lib/auth';
import { isSupabaseEnabled, supabaseGoalContributions } from '@/lib/supabase';
import { scheduleFinancialRecalculation } from '@/lib/domain/financial/engine.runner';

export function useGoalContributions() {
  const { isAuthenticated } = useAuth();

  return useQuery<GoalContribution[]>({
    queryKey: queryKeys.goalContributions,
    queryFn: () => supabaseGoalContributions.fetchGoalContributions(),
    enabled: isAuthenticated && isSupabaseEnabled(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateGoalContribution() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: (input: CreateGoalContributionInput) =>
      supabaseGoalContributions.createGoalContribution(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goalContributions });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.assets });
      queryClient.invalidateQueries({ queryKey: queryKeys.home });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
      scheduleFinancialRecalculation(queryClient, userId, {
        type: 'goal_contribution_created',
        goalId: variables.goalId,
      });
    },
  });
}

export function useCreateGoalWithdrawal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: (input: CreateGoalWithdrawalInput) =>
      supabaseGoalContributions.createGoalWithdrawal(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goalContributions });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.assets });
      queryClient.invalidateQueries({ queryKey: queryKeys.home });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
      scheduleFinancialRecalculation(queryClient, userId, {
        type: 'goal_contribution_withdrawn',
        goalId: variables.goalId,
      });
    },
  });
}
