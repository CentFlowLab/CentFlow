import type { SymbolViewProps } from 'expo-symbols';

import type { AssetsTab } from '@/lib/domain/assets.types';

export const ASSETS_SEGMENTS = [
  { key: 'objetivos' as const, label: 'Objetivos' },
  { key: 'garantias' as const, label: 'Garantias' },
  { key: 'inventario' as const, label: 'Inventário' },
  { key: 'creditos' as const, label: 'Créditos' },
  { key: 'subscricoes' as const, label: 'Subscrições' },
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
      'Regista produtos com data de validade e evita perder direitos por esquecimento.',
    actionLabel: 'Adicionar garantia',
    secondaryActionLabel: 'Como funciona',
    highlights: [
      'Alertas antes da expiração',
      'Histórico por produto',
      'Integrado com o dashboard',
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
  creditos: {
    icon: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
    title: 'Regista os teus créditos',
    description:
      'Acompanha saldos em dívida e próximos pagamentos para teres visibilidade sobre passivos.',
    actionLabel: 'Adicionar crédito',
    secondaryActionLabel: 'Como funciona',
    highlights: [
      'Saldo em dívida no património',
      'Próximo pagamento visível',
      'Alertas no dashboard',
    ],
  },
  subscricoes: {
    icon: { ios: 'repeat.circle.fill', android: 'autorenew', web: 'autorenew' },
    title: 'Controla as subscrições',
    description:
      'Netflix, ginásio, cloud — regista custos recorrentes e evita surpresas no fim do mês.',
    actionLabel: 'Adicionar subscrição',
    secondaryActionLabel: 'Dicas',
    highlights: [
      'Total mensal estimado',
      'Datas de renovação',
      'Ligação futura a Preços',
    ],
  },
};

export const ASSETS_SECTION_META: Record<
  AssetsTab,
  { title: string; subtitle: string; addLabel: string }
> = {
  objetivos: {
    title: 'Objetivos de poupança',
    subtitle: 'Metas financeiras com progresso visível',
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
  creditos: {
    title: 'Créditos e passivos',
    subtitle: 'Dívidas e próximos pagamentos',
    addLabel: 'Novo crédito',
  },
  subscricoes: {
    title: 'Subscrições',
    subtitle: 'Custos recorrentes mensais',
    addLabel: 'Nova subscrição',
  },
};
