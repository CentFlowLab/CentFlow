import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { useAuth } from '@/lib/auth';
import { fetchOnboardingAnswers } from '@/lib/onboarding/answers.service';
import { EMPTY_ONBOARDING_ANSWERS } from '@/lib/onboarding/types';

export function useOnboardingAnswers() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.onboardingAnswers,
    queryFn: () => fetchOnboardingAnswers(user!.id),
    enabled: isAuthenticated && Boolean(user?.id),
    staleTime: 1000 * 60 * 30,
    initialData: EMPTY_ONBOARDING_ANSWERS,
  });
}
