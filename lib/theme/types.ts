/** Identificadores estáveis dos skins da app. */
export type ThemeId = 'classic' | 'midnight-indigo' | 'warm-graphite' | 'deep-emerald';

/** @deprecated alias — migrado para `classic`. */
export type LegacyThemeId = 'dark-premium' | 'dark-classic';

export type ThemeColors = {
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceElevated: string;
  surfaceHighlight: string;

  border: string;
  borderStrong: string;

  primary: string;
  primaryMuted: string;
  primaryDark: string;
  primaryGlow: string;

  accent: string;
  accentMuted: string;

  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  success: string;
  successMuted: string;
  danger: string;
  dangerMuted: string;
  warning: string;

  tabBar: string;
  tabBarBorder: string;

  overlay: string;

  gradientPrimary: readonly [string, string];
  gradientAccent: readonly [string, string];
  gradientSurface: readonly [string, string];
};

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  previewBackground: string;
  previewAccent: string;
  colors: ThemeColors;
};

export type ColorKey = keyof ThemeColors;
