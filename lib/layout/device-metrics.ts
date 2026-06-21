import { Dimensions } from 'react-native';

import { spacing } from '@/lib/theme';

/** Largura mínima (dp) a partir da qual tratamos o aparelho como tablet. */
export const TABLET_MIN_WIDTH = 600;

/** Altura (dp) abaixo da qual tratamos como ecrã pequeno (ex. Galaxy A12 ~640dp). */
export const SMALL_SCREEN_MAX_HEIGHT = 700;

export type DeviceDimensions = {
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
  systemUiGap: number;
  isTablet: boolean;
  isSmallScreen: boolean;
};

export function getDeviceDimensions(): DeviceDimensions {
  const screen = Dimensions.get('screen');
  const window = Dimensions.get('window');

  const minWindowEdge = Math.min(window.width, window.height);

  return {
    screenWidth: screen.width,
    screenHeight: screen.height,
    windowWidth: window.width,
    windowHeight: window.height,
    systemUiGap: Math.max(0, screen.height - window.height),
    isTablet: minWindowEdge >= TABLET_MIN_WIDTH,
    isSmallScreen: window.height < SMALL_SCREEN_MAX_HEIGHT,
  };
}

/** Padding horizontal dos ecrãs — maior em tablets para não esticar conteúdo. */
export function resolveScreenHorizontalPadding(isTablet: boolean): number {
  return isTablet ? spacing['2xl'] : spacing.lg;
}

/** Altura do conteúdo da tab bar (ícones + labels). */
export function resolveTabBarContentHeight(platform: string): number {
  if (platform === 'ios') return 72;
  if (platform === 'android') return 72;
  return 72;
}

/** Elevação visual do botão central Análises (negativo = sobe acima da tab bar). */
export const ANALYSIS_TAB_LIFT = {
  inactive: 22,
  active: 28,
} as const;

/** Diâmetro do círculo premium Análises. */
export const ANALYSIS_TAB_CIRCLE = {
  inactive: 58,
  active: 62,
} as const;

/** Tamanho do emblema dentro do círculo. */
export const ANALYSIS_TAB_EMBLEM = {
  inactive: 42,
  active: 46,
} as const;

export function resolveModalMaxHeight(windowHeight: number, ratio = 0.88): number {
  return Math.round(windowHeight * ratio);
}
