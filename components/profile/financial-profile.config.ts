import type { SymbolViewProps } from 'expo-symbols';

import type { FinancialProfileLevel, ProfileDimensionId } from '@/lib/domain/financial-profile.types';
import { colors } from '@/lib/theme';

export const PROFILE_DIMENSION_ICONS: Record<ProfileDimensionId, SymbolViewProps['name']> = {
  transactions: { ios: 'list.bullet', android: 'receipt_long', web: 'receipt_long' },
  receipts: { ios: 'doc.text.viewfinder', android: 'document_scanner', web: 'document_scanner' },
  goals: { ios: 'target', android: 'flag', web: 'flag' },
  assets: { ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' },
  patrimony: { ios: 'banknote.fill', android: 'account_balance', web: 'account_balance' },
};

export const PROFILE_LEVELS: Array<{
  level: FinancialProfileLevel;
  label: string;
  title: string;
  minScore: number;
  features: string[];
}> = [
  {
    level: 1,
    label: 'Nível 1',
    title: 'Insights básicos',
    minScore: 0,
    features: ['Resumo de gastos', 'Alertas simples'],
  },
  {
    level: 2,
    label: 'Nível 2',
    title: 'Métricas avançadas',
    minScore: 30,
    features: ['Inflação pessoal', 'Comparações mensais', 'Alocação de património'],
  },
  {
    level: 3,
    label: 'Nível 3',
    title: 'Assistente CentFlow',
    minScore: 60,
    features: ['IA personalizada', 'Sugestões proativas', 'Perguntas em linguagem natural'],
  },
];

export function getProfileProgressColor(score: number): string {
  if (score >= 60) return colors.success;
  if (score >= 30) return colors.primary;
  return colors.accent;
}
