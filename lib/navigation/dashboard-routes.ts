import { router } from 'expo-router';

import type { AttentionItem, Suggestion } from '@/lib/domain';
import { appHref } from '@/lib/navigation/href';

export function openAttentionItemRoute(type: AttentionItem['type']): void {
  if (type === 'credit') {
    router.push(appHref('creditos'));
    return;
  }
  if (type === 'subscription') {
    router.push('/(tabs)/movimentos?view=subscricoes');
    return;
  }
  if (type === 'warranty') {
    router.push('/(tabs)/ativos?tab=garantias');
    return;
  }
  if (type === 'goal') {
    router.push('/(tabs)/ativos?tab=objetivos');
  }
}

const SUGGESTION_ROUTES: Record<string, string> = {
  'fallback-receipt': '/(tabs)/movimentos?action=receipt',
  'onboarding-receipt': '/(tabs)/movimentos?action=receipt',
  'onboarding-goal': '/(tabs)/ativos?action=new-goal',
  'onboarding-debt': '/(tabs)/movimentos?action=new-movement',
  'onboarding-wealth': '/(tabs)/ativos?action=new-asset',
  'onboarding-default': '/(tabs)/movimentos?action=new-movement',
  'sug-first-goal': '/(tabs)/ativos?action=new-goal',
  'sug-review-spending': '/(tabs)/analises',
  'sug-analyses': '/(tabs)/analises',
};

function routeBySuggestionType(type: Suggestion['type']): string {
  switch (type) {
    case 'goal':
      return '/(tabs)/ativos?action=new-goal';
    case 'savings':
    case 'investment':
      return '/(tabs)/analises';
    default:
      return '/(tabs)/movimentos?action=new-movement';
  }
}

export function resolveSuggestionRoute(suggestion: Pick<Suggestion, 'id' | 'type' | 'ctaRoute'>): string {
  if (suggestion.ctaRoute) return suggestion.ctaRoute;
  return SUGGESTION_ROUTES[suggestion.id] ?? routeBySuggestionType(suggestion.type);
}

export function openSuggestionRoute(suggestion: Pick<Suggestion, 'id' | 'type' | 'ctaRoute'>): void {
  router.push(resolveSuggestionRoute(suggestion) as never);
}
