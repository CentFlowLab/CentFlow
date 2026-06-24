import { router } from 'expo-router';

import type { AttentionItem, Suggestion } from '@/lib/domain';

export function openAttentionItemRoute(type: AttentionItem['type']): void {
  if (type === 'credit') {
    router.push('/(tabs)/precos');
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

export function openSuggestionRoute(type: Suggestion['type']): void {
  switch (type) {
    case 'goal':
    case 'savings':
      router.push('/(tabs)/ativos?tab=objetivos');
      break;
    case 'investment':
      router.push('/(tabs)/analises');
      break;
    default:
      router.push('/(tabs)/analises');
      break;
  }
}
