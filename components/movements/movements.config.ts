import type { SymbolViewProps } from 'expo-symbols';

import type { MovementsView } from '@/lib/domain/assets.types';

export const MOVEMENTS_VIEW_SEGMENTS = [
  { key: 'movimentos' as const, label: 'Movimentos' },
  { key: 'subscricoes' as const, label: 'Fixos' },
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
    title: 'Despesas fixas e subscrições',
    description:
      'Adiciona subscrições, rendas ou outros custos fixos e acompanha tudo num só lugar.',
    actionLabel: 'Adicionar fixo',
    secondaryActionLabel: 'Dicas',
    highlights: [
      'Deteção automática a partir de movimentos',
      'Total mensal estimado',
      'Datas de renovação',
    ],
  },
};
