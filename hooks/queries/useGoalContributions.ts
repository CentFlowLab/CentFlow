import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import type {
  CreateGoalContributionInput,
  CreateGoalWithdrawalInput,
  GoalContribution,
} from '@/lib/domain/goal-contribution.types';
import { useAuth } from '@/lib/auth';
import { ACCOUNTS_FEATURE_ENABLED } from '@/lib/config/product-features';
import { isSupabaseEnabled, supabaseGoalContributions } from '@/lib/supabase';

export function useGoalContributions() {
  const { isAuthenticated } = useAuth();

  return useQuery<GoalContribution[]>({
    queryKey: queryKeys.goalContributions,
    queryFn: () => supabaseGoalContributions.fetchGoalContributions(),
    enabled: isAuthenticated && ACCOUNTS_FEATURE_ENABLED && isSupabaseEnabled(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateGoalContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGoalContributionInput) =>
      supabaseGoalContributions.createGoalContribution(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goalContributions });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.assets });
      queryClient.invalidateQueries({ queryKey: queryKeys.home });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
    },
  });
}

export function useCreateGoalWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGoalWithdrawalInput) =>
      supabaseGoalContributions.createGoalWithdrawal(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goalContributions });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.assets });
      queryClient.invalidateQueries({ queryKey: queryKeys.home });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
    },
  });
}
