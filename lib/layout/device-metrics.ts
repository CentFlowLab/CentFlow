import { Dimensions } from 'react-native';

export type DeviceDimensions = {
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
  systemUiGap: number;
};

export function getDeviceDimensions(): DeviceDimensions {
  const screen = Dimensions.get('screen');
  const window = Dimensions.get('window');

  return {
    screenWidth: screen.width,
    screenHeight: screen.height,
    windowWidth: window.width,
    windowHeight: window.height,
    systemUiGap: Math.max(0, screen.height - window.height),
  };
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
