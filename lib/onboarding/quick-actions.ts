import type { QuickAddActionId } from '@/components/layout/QuickAddMenuSheet';
import {
  getContextualQuickAddActions,
  type QuickAddScreenContext,
} from '@/lib/navigation/quick-add-context';

import type { OnboardingAnswers, PrimaryObjectiveId, WowActionId } from './types';

const FIRST_ACTION_MAP: Partial<Record<WowActionId, QuickAddActionId>> = {
  first_receipt: 'receipt',
  first_movement: 'movement',
  first_asset: 'asset',
  first_goal: 'goal',
  first_warranty: 'warranty',
  first_subscription: 'subscription',
};

const OBJECTIVE_ACTIONS: Partial<Record<PrimaryObjectiveId, QuickAddActionId[]>> = {
  control_spending: ['movement', 'receipt', 'goal'],
  save_more: ['goal', 'movement', 'asset'],
  track_wealth: ['asset', 'goal', 'movement'],
  receipts_warranties: ['receipt', 'warranty', 'movement'],
  subscriptions: ['subscription', 'movement', 'goal'],
  organize_credits: ['credit', 'movement', 'goal'],
};

function homeAllowedActions(answers: OnboardingAnswers): QuickAddActionId[] {
  const allowed = new Set<QuickAddActionId>(['quick_expense', 'movement', 'asset', 'goal']);
  const tags = new Set(answers.profileTags);

  if (
    answers.creditTypes.length > 0 ||
    answers.hasDebt ||
    tags.has('credits_costs') ||
    answers.primaryObjective === 'organize_credits'
  ) {
    allowed.add('credit');
  }

  if (
    tags.has('receipts_warranties') ||
    answers.primaryObjective === 'receipts_warranties' ||
    answers.firstAction === 'first_receipt'
  ) {
    allowed.add('receipt');
  }

  if (tags.has('receipts_warranties') || answers.firstAction === 'first_warranty') {
    allowed.add('warranty');
  }

  if (
    answers.primaryObjective === 'subscriptions' ||
    answers.lifeAreas.includes('subscriptions')
  ) {
    allowed.add('subscription');
  }

  if (answers.investmentTypes.some((type) => type !== 'none') || tags.has('track_wealth')) {
    allowed.add('asset');
  }

  return Array.from(allowed);
}

/**
 * Ranking de acções rápidas com base no onboarding:
 * 1. firstAction
 * 2. objetivo principal
 * 3. áreas/creditos/investimentos
 * 4. fallback do ecrã
 */
export function getRankedQuickAddActions(
  context: QuickAddScreenContext,
  answers: OnboardingAnswers | null | undefined,
): QuickAddActionId[] {
  const screenDefaults = getContextualQuickAddActions(context);
  if (!answers?.completed || context !== 'home') {
    return screenDefaults;
  }

  const allowed = homeAllowedActions(answers);
  const ranked: QuickAddActionId[] = [];

  const push = (id: QuickAddActionId) => {
    if (allowed.includes(id) && !ranked.includes(id)) ranked.push(id);
  };

  if (answers.firstAction) {
    const mapped = FIRST_ACTION_MAP[answers.firstAction];
    if (mapped) push(mapped);
  }

  if (answers.primaryObjective) {
    for (const id of OBJECTIVE_ACTIONS[answers.primaryObjective] ?? []) {
      push(id);
    }
  }

  if (answers.creditTypes.length > 0 || answers.hasDebt) push('credit');
  if (answers.investmentTypes.some((type) => type !== 'none')) push('asset');
  if (answers.profileTags.includes('receipts_warranties')) push('receipt');

  for (const id of screenDefaults) push(id);

  return ranked.length > 0 ? ranked : screenDefaults;
}
