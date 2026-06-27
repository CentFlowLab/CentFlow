import type { QuickAddActionId } from '@/components/layout/QuickAddMenuSheet';

export type QuickAddScreenContext =
  | 'home'
  | 'movimentos'
  | 'subscricoes'
  | 'creditos'
  | 'ativos_objetivos'
  | 'ativos_garantias'
  | 'ativos_inventario';

/** Acções contextuais do botão + — nunca mostrar opções irrelevantes ao ecrã. */
export function getContextualQuickAddActions(
  context: QuickAddScreenContext,
): QuickAddActionId[] {
  switch (context) {
    case 'home':
      return ['movement', 'asset', 'goal'];
    case 'movimentos':
      return ['movement'];
    case 'subscricoes':
      return ['subscription'];
    case 'creditos':
      return ['credit'];
    case 'ativos_objetivos':
      return ['goal'];
    case 'ativos_garantias':
      return ['warranty'];
    case 'ativos_inventario':
      return ['asset'];
    default:
      return ['movement'];
  }
}

export function getQuickAddContextLabel(context: QuickAddScreenContext): string {
  switch (context) {
    case 'movimentos':
      return 'Novo movimento';
    case 'subscricoes':
      return 'Nova subscrição';
    case 'creditos':
      return 'Novo crédito';
    case 'ativos_objetivos':
      return 'Novo objetivo';
    case 'ativos_garantias':
      return 'Nova garantia';
    case 'ativos_inventario':
      return 'Novo ativo';
    default:
      return 'Adicionar';
  }
}
