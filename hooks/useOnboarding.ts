import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

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
  const [completed, setCompleted] = useState<boolean | null>(null);

  const refreshCompletion = useCallback(async () => {
    if (!userId) {
      setCompleted(null);
      return;
    }

    if (isOnboardingGateBypassed()) {
      setCompleted(true);
      return;
    }

    try {
      const value = await isOnboardingComplete(userId);
      setCompleted(value);
    } catch {
      setCompleted(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshCompletion();
  }, [refreshCompletion]);

  useEffect(() => {
    if (!userId || isOnboardingGateBypassed()) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshCompletion();
      }
    });

    return () => subscription.remove();
  }, [refreshCompletion, userId]);

  const complete = useCallback(
    async (answers?: Partial<OnboardingAnswers>) => {
      if (!userId) return;

      const current = await fetchOnboardingAnswers(userId);
      const next: OnboardingAnswers = {
        ...current,
        ...answers,
        completed: true,
        completedAt: new Date().toISOString(),
      };

      await saveOnboardingAnswersForUser(userId, next);
      setCompleted(true);
      queryClient.invalidateQueries({ queryKey: queryKeys.onboardingAnswers });
    },
    [userId, queryClient],
  );

  const skip = useCallback(async () => {
    if (!userId) return;

    const current = await fetchOnboardingAnswers(userId);
    await saveOnboardingAnswersForUser(userId, {
      ...current,
      skipped: true,
      completed: true,
      completedAt: new Date().toISOString(),
    });
    setCompleted(true);
    queryClient.invalidateQueries({ queryKey: queryKeys.onboardingAnswers });
  }, [userId, queryClient]);

  const reset = useCallback(async () => {
    if (!userId) return;

    await saveOnboardingAnswersForUser(userId, { ...EMPTY_ONBOARDING_ANSWERS });
    setCompleted(false);
    queryClient.invalidateQueries({ queryKey: queryKeys.onboardingAnswers });
  }, [userId, queryClient]);

  return {
    completed,
    isLoading:
      !isOnboardingGateBypassed() && completed === null && Boolean(userId),
    complete,
    skip,
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
