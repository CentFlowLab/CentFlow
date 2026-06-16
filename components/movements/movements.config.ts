import type { SymbolViewProps } from 'expo-symbols';

import type { MovementsView } from '@/lib/domain/assets.types';

export const MOVEMENTS_VIEW_SEGMENTS = [
  { key: 'movimentos' as const, label: 'Movimentos' },
  { key: 'creditos' as const, label: 'Créditos' },
  { key: 'subscricoes' as const, label: 'Subscrições' },
];

export type MovementsEmptyConfig = {
  icon: SymbolViewProps['name'];
  title: string;
  description: string;
  actionLabel: string;
  secondaryActionLabel?: string;
  highlights: string[];
};

export const MOVEMENTS_EMPTY_CONFIG: Record<
  Exclude<MovementsView, 'movimentos'>,
  MovementsEmptyConfig
> = {
  creditos: {
    icon: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
    title: 'Simula e regista créditos',
    description:
      'Introduz TAEG, spread, prazo e rendimento para uma análise completa dos critérios de crédito.',
    actionLabel: 'Novo crédito',
    secondaryActionLabel: 'Como funciona',
    highlights: [
      'Simulador com taxa de esforço',
      'Alertas de TAEG e spread elevados',
      'Integrado no património',
    ],
  },
  subscricoes: {
    icon: { ios: 'repeat.circle.fill', android: 'autorenew', web: 'autorenew' },
    title: 'Controla subscrições',
    description:
      'Detetamos padrões recorrentes nos movimentos e pedimos confirmação antes de registar.',
    actionLabel: 'Adicionar subscrição',
    secondaryActionLabel: 'Dicas',
    highlights: [
      'Deteção automática a partir de movimentos',
      'Total mensal estimado',
      'Datas de renovação',
    ],
  },
};
