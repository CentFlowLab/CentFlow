import type { QuickAddActionId } from '@/components/layout/QuickAddMenuSheet';
import type { AssetsTab } from '@/lib/domain/assets.types';
import type { MovementsView } from '@/lib/domain/assets.types';

/** Ações rápidas permitidas por ecrã — o botão + nunca mostra opções irrelevantes. */
export function getHomeQuickAddActions(): QuickAddActionId[] {
  return ['movement', 'asset', 'goal'];
}

export function getMovementsQuickAddActions(view: MovementsView): QuickAddActionId[] {
  if (view === 'subscricoes') return ['subscription'];
  return ['movement'];
}

export function getAssetsQuickAddActions(tab: AssetsTab): QuickAddActionId[] {
  switch (tab) {
    case 'garantias':
      return ['warranty'];
    case 'inventario':
      return ['asset'];
    case 'objetivos':
    default:
      return ['goal'];
  }
}

/** Créditos: acção directa, sem menu. */
export function shouldUseDirectAddAction(screen: 'precos'): boolean {
  return screen === 'precos';
}
