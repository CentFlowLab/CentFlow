import { loadOnboardingAnswers, saveOnboardingAnswers } from '@/lib/onboarding/storage';
import { computeEnabledFeatures } from '@/lib/onboarding/features';

import type { Migration } from './migrationRunner';

export const onboardingMigrations: Migration[] = [
  {
    id: 'onboarding-v1-enabled-features',
    version: 1,
    async run({ userId }) {
      const answers = await loadOnboardingAnswers(userId);
      if (!answers) return;

      if (!answers.enabledFeatures || answers.enabledFeatures.length === 0) {
        await saveOnboardingAnswers(userId, {
          ...answers,
          enabledFeatures: computeEnabledFeatures(answers),
        });
      }
    },
  },
];
