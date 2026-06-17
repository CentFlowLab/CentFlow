import type { SymbolViewProps } from 'expo-symbols';

import type { MovementsView } from '@/lib/domain/assets.types';

export const MOVEMENTS_VIEW_SEGMENTS = [
  { key: 'movimentos' as const, label: 'Movimentos' },
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
  subscricoes: {
    icon: { ios: 'repeat.circle.fill', android: 'autorenew', web: 'autorenew' },
    title: 'Nunca percas uma renovação',
    description:
      'Adiciona uma subscrição e acompanha custos recorrentes num só lugar.',
    actionLabel: 'Adicionar subscrição',
    secondaryActionLabel: 'Dicas',
    highlights: [
      'Deteção automática a partir de movimentos',
      'Total mensal estimado',
      'Datas de renovação',
    ],
  },
};
