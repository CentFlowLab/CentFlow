import { createContext, useContext } from 'react';

/**
 * Controlo do scroll do ecrã (`Screen`) para componentes do design system que arrastam conteúdo
 * (ex.: a lista ordenável). Fora de um `Screen`, tudo é inofensivo (no-op).
 */
export type ScreenScroll = {
  /** Bloqueia ou liberta o scroll feito pelo dedo/rato (o `scrollBy` continua a funcionar). */
  setScrollLocked(locked: boolean): void;
  /** Posição atual do scroll, em px. */
  getScrollOffset(): number;
  /** Faz scroll de `dy` px (limitado ao início e ao fim do conteúdo), sem animação. */
  scrollBy(dy: number): void;
  /** Área visível do scroll em coordenadas da janela, se já foi medida. */
  getViewport(): { top: number; height: number } | null;
};

export const NO_SCREEN_SCROLL: ScreenScroll = {
  setScrollLocked: () => undefined,
  getScrollOffset: () => 0,
  scrollBy: () => undefined,
  getViewport: () => null,
};

export const ScreenScrollContext = createContext<ScreenScroll>(NO_SCREEN_SCROLL);

export function useScreenScroll(): ScreenScroll {
  return useContext(ScreenScrollContext);
}
