/**
 * Cores semânticas. Os componentes usam apenas estes nomes, nunca valores hexadecimais.
 * Contrastes de texto verificados contra WCAG 2.1 AA (≥ 4.5:1) sobre `background` e `surface`.
 */
export type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  primary: string;
  primaryPressed: string;
  primaryMuted: string;
  primaryText: string;
  onPrimary: string;

  positive: string;
  positiveMuted: string;
  negative: string;
  negativeMuted: string;
  warning: string;
  warningMuted: string;

  overlay: string;
  shadow: string;
};

export type ColorScheme = 'light' | 'dark';

export const BRAND = {
  gradientStart: '#6D6CFF',
  gradientEnd: '#3B2FC9',
  primary: '#4B45E6',
} as const;

export const lightColors: ThemeColors = {
  background: '#F7F7F9',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEFF3',
  surfaceHover: '#F2F2F6',
  border: '#E4E4EA',
  borderStrong: '#D0D0DA',

  text: '#0E0E12',
  textSecondary: '#5A5C6A',
  textTertiary: '#6B6D7B',
  textInverse: '#FFFFFF',

  primary: BRAND.primary,
  primaryPressed: '#3D37C9',
  primaryMuted: '#ECEBFE',
  primaryText: '#4B45E6',
  onPrimary: '#FFFFFF',

  positive: '#0B7F3F',
  positiveMuted: '#E3F5EA',
  negative: '#D1293A',
  negativeMuted: '#FCEBEC',
  warning: '#9A5800',
  warningMuted: '#FFF3D6',

  overlay: 'rgba(14, 14, 18, 0.4)',
  shadow: 'rgba(16, 16, 32, 0.06)',
};

export const darkColors: ThemeColors = {
  background: '#0B0B0D',
  surface: '#141417',
  surfaceMuted: '#1D1D22',
  surfaceHover: '#1A1A1F',
  border: '#25252C',
  borderStrong: '#34343D',

  text: '#F4F4F6',
  textSecondary: '#A3A4B0',
  textTertiary: '#8B8D9A',
  textInverse: '#0E0E12',

  primary: '#5E5BF0',
  primaryPressed: '#4E4BD9',
  primaryMuted: '#1E1D3D',
  primaryText: '#A3A1FF',
  onPrimary: '#FFFFFF',

  positive: '#3DD68C',
  positiveMuted: '#11271C',
  negative: '#FF6B72',
  negativeMuted: '#2E1417',
  warning: '#F5B841',
  warningMuted: '#2D230F',

  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.4)',
};

export const colorsByScheme: Record<ColorScheme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};
