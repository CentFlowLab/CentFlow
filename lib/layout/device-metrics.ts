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

/** Altura do conteúdo da tab bar (ícones + labels), sem safe area inferior. */
export function resolveTabBarContentHeight(platform: string): number {
  if (platform === 'ios') return 76;
  if (platform === 'android') return 72;
  return 72;
}

/** Elevação visual do botão central Análises (negativo = sobe). */
export const ANALYSIS_TAB_LIFT = {
  inactive: 8,
  active: 14,
} as const;

export function resolveModalMaxHeight(windowHeight: number, ratio = 0.88): number {
  return Math.round(windowHeight * ratio);
}
