import { useCallback, useEffect, useState } from 'react';

import {
  getOnboardingCompleted,
  setOnboardingCompleted,
} from '@/lib/onboarding/storage';

export function useOnboarding() {
  const [completed, setCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    getOnboardingCompleted()
      .then((value) => {
        if (mounted) setCompleted(value);
      })
      .catch(() => {
        if (mounted) setCompleted(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const complete = useCallback(async () => {
    await setOnboardingCompleted();
    setCompleted(true);
  }, []);

  return {
    completed,
    isLoading: completed === null,
    complete,
  };
}
