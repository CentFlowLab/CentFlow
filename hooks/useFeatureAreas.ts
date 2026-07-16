import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { queryKeys } from '@/lib/api/keys';
import { useAuth } from '@/lib/auth';
import { saveOnboardingAnswersForUser } from '@/lib/onboarding/answers.service';
import {
  computeEnabledFeatures,
  isFeatureActive,
  withActivatedFeature,
} from '@/lib/onboarding/features';
import type { FeatureAreaId } from '@/lib/onboarding/types';

export function useFeatureAreas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: answers, isLoading } = useOnboardingAnswers();

  const checkActive = useCallback(
    (feature: FeatureAreaId) => isFeatureActive(answers, feature),
    [answers],
  );

  const activateFeature = useCallback(
    async (feature: FeatureAreaId): Promise<boolean> => {
      if (!user?.id || !answers) return false;

      try {
        const next = withActivatedFeature(answers, feature);
        await saveOnboardingAnswersForUser(user.id, next);
        queryClient.setQueryData(queryKeys.onboardingAnswers, next);
        return true;
      } catch {
        return false;
      }
    },
    [answers, queryClient, user],
  );

  const enabledFeatures =
    answers && answers.enabledFeatures.length > 0
      ? answers.enabledFeatures
      : answers
        ? computeEnabledFeatures(answers)
        : [];

  return {
    answers,
    isLoading,
    enabledFeatures,
    isFeatureActive: checkActive,
    activateFeature,
    onboardingCompleted: answers?.completed ?? false,
  };
}
