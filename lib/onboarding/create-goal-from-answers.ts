import { createGoal } from '@/lib/api/services/assets.service';
import type { OnboardingAnswers } from '@/lib/onboarding/types';

function addMonthsToIsoDate(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + Math.max(1, months));
  return date.toISOString().slice(0, 10);
}

function resolveGoalName(answers: OnboardingAnswers): string {
  const objective = answers.primaryObjective;
  if (objective === 'save_more') return 'Fundo de poupança';
  if (objective === 'organize_credits') return 'Reduzir dívidas';
  if (objective === 'track_wealth') return 'Crescer património';
  if (objective === 'control_spending') return 'Controlar gastos';
  if (objective === 'subscriptions') return 'Optimizar subscrições';
  if (objective === 'receipts_warranties') return 'Organizar compras';
  return 'Objetivo de poupança';
}

/**
 * Cria um objetivo real a partir das respostas de onboarding.
 * Falha silenciosa — não bloqueia a conclusão do onboarding.
 */
export async function createGoalFromOnboardingAnswers(
  answers: OnboardingAnswers,
): Promise<void> {
  const target = answers.savingsGoal ?? 0;
  if (target <= 0) return;

  const months = answers.savingsMonths ?? 12;

  await createGoal({
    name: resolveGoalName(answers),
    target,
    current: 0,
    deadline: addMonthsToIsoDate(months),
  });
}
