import type { Suggestion } from '@/lib/domain/types';

import { getPersonalizedFallbackSuggestions } from './personalization';
import type { OnboardingAnswers } from './types';

/** Combina sugestões genéricas do dashboard com sugestões personalizadas do onboarding. */
export function mergeHomeSuggestions(
  generic: Suggestion[],
  answers: OnboardingAnswers | null | undefined,
): Suggestion[] {
  const personalized = getPersonalizedFallbackSuggestions(answers ?? null).map<Suggestion>(
    (item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      actionLabel: item.actionLabel,
      type: item.type,
      ctaRoute: item.ctaRoute,
    }),
  );

  const seen = new Set<string>();
  const merged: Suggestion[] = [];

  for (const item of [...personalized, ...generic]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }

  return merged.slice(0, 3);
}
