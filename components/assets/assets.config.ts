import type { SymbolViewProps } from 'expo-symbols';

import type { AssetsTab } from '@/lib/domain/assets.types';

export const ASSETS_SEGMENTS = [
  { key: 'objetivos' as const, label: 'Objetivos' },
  { key: 'garantias' as const, label: 'Garantias' },
  { key: 'inventario' as const, label: 'Inventário' },
];

export type AssetsEmptyConfig = {
  icon: SymbolViewProps['name'];
  title: string;
  description: string;
  actionLabel: string;
  secondaryActionLabel?: string;
  highlights: string[];
};

export const ASSETS_EMPTY_CONFIG: Record<AssetsTab, AssetsEmptyConfig> = {
  objetivos: {
    icon: { ios: 'target', android: 'flag', web: 'flag' },
    title: 'Define o teu primeiro objetivo',
    description:
      'Metas claras ajudam-te a poupar com propósito — viagem, fundo de emergência ou um projeto pessoal.',
    actionLabel: 'Criar objetivo',
    secondaryActionLabel: 'Ver exemplos',
    highlights: [
      'Acompanha progresso em percentagem',
      'Liga objetivos ao teu património',
      'Recebe sugestões no dashboard',
    ],
  },
  garantias: {
    icon: { ios: 'shield.fill', android: 'verified_user', web: 'verified_user' },
    title: 'Guarda as tuas garantias',
    description:
      'Digitaliza talões para criar movimentos e guardar garantias automaticamente — com alertas antes de expirarem.',
    actionLabel: 'Adicionar garantia',
    secondaryActionLabel: 'Como funciona',
    highlights: [
      'OCR lê o talão e preenche dados',
      'Alertas antes da expiração',
      'Histórico por produto e loja',
    ],
  },
  inventario: {
    icon: { ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' },
    title: 'Inventaria os teus bens',
    description:
      'Mantém registo do valor dos teus ativos físicos — eletrónica, joias, equipamento.',
    actionLabel: 'Adicionar item',
    secondaryActionLabel: 'Porquê registar',
    highlights: [
      'Valor total no património',
      'Organização por categoria',
      'Base para seguros e garantias',
    ],
  },
};

export const ASSETS_SECTION_META: Record<
  AssetsTab,
  { title: string; subtitle: string; addLabel: string }
> = {
  objetivos: {
    title: 'Objetivos de poupança',
    subtitle: 'Metas financeiras com progresso visível — poupanças dos objetivos não entram no património líquido',
    addLabel: 'Novo objetivo',
  },
  garantias: {
    title: 'Garantias de produtos',
    subtitle: 'Validade e alertas de expiração',
    addLabel: 'Nova garantia',
  },
  inventario: {
    title: 'Inventário de bens',
    subtitle: 'Ativos físicos e valor estimado',
    addLabel: 'Novo item',
  },
};
