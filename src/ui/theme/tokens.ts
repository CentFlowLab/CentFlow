/** Escala de espaçamento em múltiplos de 4. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  full: 999,
} as const;

/** Breakpoints de largura (px lógicos). */
export const breakpoints = {
  medium: 768,
  expanded: 1200,
} as const;

export const layout = {
  contentMaxWidth: 1120,
  sidebarWidth: 248,
  railWidth: 76,
  bottomBarHeight: 60,
  minTouchTarget: 44,
} as const;

export const durations = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
