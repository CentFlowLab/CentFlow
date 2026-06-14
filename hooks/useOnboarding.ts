import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { useAuth } from '@/lib/auth';
import {
  fetchOnboardingAnswers,
  isOnboardingComplete,
  saveOnboardingAnswersForUser,
} from '@/lib/onboarding/answers.service';
import { isOnboardingGateBypassed } from '@/lib/onboarding/gate';
import type { OnboardingAnswers } from '@/lib/onboarding/types';
import { EMPTY_ONBOARDING_ANSWERS } from '@/lib/onboarding/types';

export function useOnboarding() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const bypass = isOnboardingGateBypassed();

  const {
    data: completed,
    isPending,
    isError,
    refetch: refreshCompletion,
  } = useQuery({
    queryKey: queryKeys.onboardingStatus(userId ?? ''),
    queryFn: () => isOnboardingComplete(userId!),
    enabled: Boolean(userId) && !bypass,
    staleTime: 0,
    retry: 1,
    throwOnError: false,
  });

  useEffect(() => {
    if (!userId || bypass) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshCompletion();
      }
    });

    return () => subscription.remove();
  }, [bypass, refreshCompletion, userId]);

  const complete = useCallback(
    async (answers?: Partial<OnboardingAnswers>) => {
      if (!userId) return;

      queryClient.setQueryData(queryKeys.onboardingStatus(userId), true);

      const current = await fetchOnboardingAnswers(userId);
      const next: OnboardingAnswers = {
        ...current,
        ...answers,
        completed: true,
        completedAt: new Date().toISOString(),
        skipped: false,
      };

      await saveOnboardingAnswersForUser(userId, next);
      queryClient.setQueryData(queryKeys.onboardingAnswers, next);
      queryClient.setQueryData(queryKeys.onboardingStatus(userId), true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.onboardingAnswers });
    },
    [queryClient, userId],
  );

  const reset = useCallback(async () => {
    if (!userId) return;

    await saveOnboardingAnswersForUser(userId, { ...EMPTY_ONBOARDING_ANSWERS });
    queryClient.setQueryData(queryKeys.onboardingStatus(userId), false);
    queryClient.setQueryData(queryKeys.onboardingAnswers, EMPTY_ONBOARDING_ANSWERS);
    await queryClient.invalidateQueries({ queryKey: queryKeys.onboardingAnswers });
  }, [queryClient, userId]);

  return {
    completed: bypass ? true : isError ? true : (completed ?? null),
    isLoading: !bypass && Boolean(userId) && isPending,
    isError,
    complete,
    reset,
    refreshCompletion,
    userId,
  };
}

export function useOnboardingAnswersState(initialName = '') {
  const [answers, setAnswers] = useState<OnboardingAnswers>(() => ({
    ...EMPTY_ONBOARDING_ANSWERS,
    displayName: initialName,
  }));

  const patch = useCallback((patch: Partial<OnboardingAnswers>) => {
    setAnswers((current) => ({ ...current, ...patch }));
  }, []);

  return { answers, patch, setAnswers };
}
