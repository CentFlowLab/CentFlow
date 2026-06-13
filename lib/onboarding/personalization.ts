import {
  AMBITION_OPTIONS,
  PROFILE_OPTIONS,
  WOW_ACTION_CONFIG,
  type WowCardConfig,
} from './constants';
import type {
  AmbitionId,
  OnboardingAnswers,
  ProfileTagId,
  WowActionId,
} from './types';

const PROFILE_LABELS = Object.fromEntries(
  PROFILE_OPTIONS.map((o) => [o.id, o.label]),
) as Record<ProfileTagId, string>;

const AMBITION_LABELS = Object.fromEntries(
  AMBITION_OPTIONS.map((o) => [o.id, o.label]),
) as Record<AmbitionId, string>;

export function getOnboardingInsights(answers: OnboardingAnswers): string[] {
  const insights: string[] = [];

  for (const tag of answers.profileTags) {
    if (tag === 'still_exploring') continue;
    insights.push(PROFILE_LABELS[tag]);
  }

  for (const ambition of answers.ambitions) {
    if (ambition === 'other') {
      if (answers.ambitionOther.trim()) {
        insights.push(answers.ambitionOther.trim());
      }
      continue;
    }
    insights.push(AMBITION_LABELS[ambition]);
  }

  if (answers.hasSavings === true) {
    insights.push('Tem poupanças para acompanhar');
  }

  if (answers.hasDebt === true) {
    insights.push('Quer ter visibilidade sobre créditos e dívidas');
  }

  if (answers.lifeAreas.includes('keeps_receipts')) {
    insights.push('Guarda faturas e talões regularmente');
  }

  return [...new Set(insights)].slice(0, 6);
}

export type PriorityFeature = {
  emoji: string;
  label: string;
};

export function getPriorityFeatures(answers: OnboardingAnswers): PriorityFeature[] {
  const features: PriorityFeature[] = [];
  const tags = new Set(answers.profileTags);
  const areas = new Set(answers.lifeAreas);

  if (
    tags.has('receipts_warranties') ||
    areas.has('keeps_receipts') ||
    areas.has('online_shopping')
  ) {
    features.push({ emoji: '🧾', label: 'Talões e garantias' });
  }

  if (tags.has('track_wealth') || areas.has('investments')) {
    features.push({ emoji: '📈', label: 'Património' });
  }

  if (tags.has('financial_goals') || areas.has('savings_goals')) {
    features.push({ emoji: '🎯', label: 'Objetivos' });
  }

  if (tags.has('control_spending')) {
    features.push({ emoji: '💳', label: 'Controlo de gastos' });
  }

  if (tags.has('credits_costs') || areas.has('credits') || answers.hasDebt) {
    features.push({ emoji: '🏦', label: 'Créditos e custos' });
  }

  if (areas.has('subscriptions')) {
    features.push({ emoji: '📱', label: 'Subscrições' });
  }

  if (features.length === 0) {
    features.push(
      { emoji: '💳', label: 'Movimentos' },
      { emoji: '📊', label: 'Análises' },
    );
  }

  return features.slice(0, 4);
}

export function getWowActionCards(answers: OnboardingAnswers): WowCardConfig[] {
  const scores: Record<WowActionId, number> = {
    first_receipt: 0,
    first_asset: 0,
    first_goal: 0,
    first_warranty: 0,
  };

  const tags = answers.profileTags;
  const areas = answers.lifeAreas;

  if (tags.includes('receipts_warranties') || areas.includes('keeps_receipts')) {
    scores.first_receipt += 3;
    scores.first_warranty += 2;
  }

  if (tags.includes('control_spending')) scores.first_receipt += 2;

  if (tags.includes('track_wealth') || areas.includes('investments')) {
    scores.first_asset += 3;
  }

  if (
    tags.includes('financial_goals') ||
    areas.includes('savings_goals') ||
    answers.ambitions.includes('more_savings')
  ) {
    scores.first_goal += 3;
  }

  if (areas.includes('own_home') || areas.includes('car')) {
    scores.first_asset += 2;
    scores.first_warranty += 1;
  }

  if (tags.includes('credits_costs') || areas.includes('credits')) {
    scores.first_asset += 1;
  }

  scores.first_receipt += 1;

  const ranked = (Object.keys(scores) as WowActionId[])
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, 4)
    .map((id) => WOW_ACTION_CONFIG[id]);

  return ranked.length > 0 ? ranked : [WOW_ACTION_CONFIG.first_receipt, WOW_ACTION_CONFIG.first_goal];
}

export function getHomeContextualMessage(answers: OnboardingAnswers | null): string | null {
  if (!answers?.completed) return null;

  if (answers.ambitions.includes('more_control') || answers.profileTags.includes('control_spending')) {
    return 'Hoje é um bom dia para manter os gastos sob controlo.';
  }

  if (answers.ambitions.includes('more_savings')) {
    return 'Cada pequeno passo conta para as tuas poupanças.';
  }

  if (answers.profileTags.includes('receipts_warranties')) {
    return 'Não percas mais faturas — digitaliza o próximo talão.';
  }

  if (answers.profileTags.includes('track_wealth')) {
    return 'Acompanha como o teu património evolui ao longo do tempo.';
  }

  if (answers.profileTags.includes('financial_goals')) {
    return 'Os teus objetivos estão mais perto quando os vês todos os dias.';
  }

  if (answers.skipped) {
    return 'Bem-vindo à CentFlow — organiza o teu dinheiro com calma.';
  }

  return 'A tua experiência foi personalizada — vamos começar.';
}

export function shouldShowDebtFeatures(answers: OnboardingAnswers): boolean {
  return (
    answers.hasDebt === true ||
    answers.profileTags.includes('credits_costs') ||
    answers.lifeAreas.includes('credits')
  );
}

export function shouldShowSavingsFeatures(answers: OnboardingAnswers): boolean {
  return (
    answers.hasSavings === true ||
    answers.profileTags.includes('financial_goals') ||
    answers.lifeAreas.includes('savings_goals')
  );
}
