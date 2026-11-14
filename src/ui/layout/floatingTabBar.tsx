import { createContext, useContext, type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, spacing } from '../theme';
import { useBreakpoint } from './useBreakpoint';

/**
 * Distância da barra flutuante ao fundo do ecrã: a área segura (home indicator) ou, sem ela, um
 * mínimo, mais uma folga. Uma só fonte de verdade para a barra e para o espaço do conteúdo.
 */
export function floatingTabBarBottom(insetBottom: number): number {
  return Math.max(insetBottom, spacing.xs) + spacing.sm;
}

const FloatingTabBarContext = createContext(false);

/** Marca a zona com a barra inferior flutuante (os separadores da app). */
export function FloatingTabBarInsetProvider({ children }: { children: ReactNode }) {
  return <FloatingTabBarContext.Provider value>{children}</FloatingTabBarContext.Provider>;
}

/**
 * Espaço a deixar no fundo do conteúdo para nada ficar escondido atrás da barra flutuante.
 * Zero fora dos separadores (modais, ecrãs de autenticação) e fora do telemóvel.
 */
export function useFloatingTabBarInset(): number {
  const inside = useContext(FloatingTabBarContext);
  const compact = useBreakpoint() === 'compact';
  const insets = useSafeAreaInsets();
  if (!inside || !compact) return 0;
  return layout.floatingTabBarHeight + floatingTabBarBottom(insets.bottom) + spacing.lg;
}
