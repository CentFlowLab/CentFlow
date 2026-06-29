import type { Suggestion, SuggestionAction } from '@/lib/domain/types';

const ACTION_BY_ID: Record<string, SuggestionAction> = {
  'fallback-receipt': 'scan_receipt',
  'onboarding-receipt': 'scan_receipt',
  'onboarding-default': 'scan_receipt',
  'onboarding-goal': 'open_ativos_goals',
  'onboarding-debt': 'open_movimentos',
  'onboarding-wealth': 'open_ativos_inventory',
};

const ACTION_BY_TYPE: Record<Suggestion['type'], SuggestionAction> = {
  goal: 'open_ativos_goals',
  savings: 'open_analises_gastos',
  investment: 'open_ativos_inventory',
  general: 'open_analises',
};

export function resolveSuggestionAction(suggestion: Suggestion): SuggestionAction {
  return suggestion.action ?? ACTION_BY_ID[suggestion.id] ?? ACTION_BY_TYPE[suggestion.type];
}
