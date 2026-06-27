import { getWowActionCards } from './personalization';
import type { OnboardingAnswers, WowActionId } from './types';

/** Deriva a primeira acção recomendada a partir das respostas do onboarding premium. */
export function resolveFirstAction(answers: OnboardingAnswers): WowActionId {
  const ranked = getWowActionCards(answers);
  return ranked[0]?.id ?? 'first_movement';
}
