import type { OnboardingAnswers, SpendAwarenessId } from './types';

export type AssistancePreferences = {
  /** Quantas acções mostrar no Plano de hoje (1–3). */
  maxInsights: number;
  /** Mostrar dica de poupança no cartão do assistente. */
  showSavingsTip: boolean;
  /** Descrições mais longas e educativas nas acções. */
  verboseDescriptions: boolean;
};

/** Resposta contextual após a pergunta de curiosidade inicial. */
export function getSpendAwarenessRevealMessage(spendAwareness: SpendAwarenessId): string {
  if (spendAwareness === 'yes') {
    return 'Perfeito.\nVamos tornar esse controlo ainda mais preciso.';
  }
  return 'Vamos descobrir.';
}

/**
 * Nível de assistência derivado do onboarding:
 * - spendAwareness "no" → mais dicas e acções
 * - spendAwareness "yes" → menos assistência
 * - financialHistory "never" → explicações mais detalhadas
 */
export function resolveAssistancePreferences(
  answers: OnboardingAnswers | null | undefined,
): AssistancePreferences {
  const spend = answers?.spendAwareness;
  const history = answers?.financialHistory;

  let maxInsights = 2;
  let showSavingsTip = true;
  let verboseDescriptions = false;

  if (spend === 'no') {
    maxInsights = 3;
    showSavingsTip = true;
    verboseDescriptions = true;
  } else if (spend === 'yes') {
    maxInsights = 1;
    showSavingsTip = false;
  }

  if (history === 'never') {
    verboseDescriptions = true;
    maxInsights = Math.max(maxInsights, 2);
  } else if (history === 'excel' || history === 'other_app' || history === 'bank') {
    if (spend !== 'no') {
      verboseDescriptions = false;
    }
  } else if (history === 'paper') {
    verboseDescriptions = spend === 'no';
  }

  return {
    maxInsights: Math.min(3, Math.max(1, maxInsights)),
    showSavingsTip,
    verboseDescriptions,
  };
}
