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

  /** Cartão de saldo: gradiente escuro de marca, igual nos dois temas. */
  heroStart: string;
  heroEnd: string;
  heroText: string;
  heroTextMuted: string;
  heroPositive: string;
  heroNegative: string;
  /** Superfícies translúcidas sobre o gradiente (chips, trilhos). */
  heroSurface: string;
  heroTrack: string;
};

export type ColorScheme = 'light' | 'dark';

/**
 * Midnight Emerald.
 * Os preenchimentos usam o esmeralda pedido (#10B981). O texto verde no modo claro
 * e o vermelho no modo escuro são tons da mesma família, porque o hexágono literal
 * não chega ao contraste WCAG AA sobre os cartões.
 */
export const BRAND = {
  navy: '#101B2D',
  slate: '#1E293B',
  emerald: '#10B981',
  ice: '#F8FAFC',
} as const;

export const lightColors: ThemeColors = {
  background: BRAND.ice,
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F6',
  surfaceHover: '#E6EDF4',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  text: BRAND.navy,
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textInverse: BRAND.ice,

  primary: BRAND.emerald,
  primaryPressed: '#0E9F70',
  primaryMuted: '#D1FAE5',
  primaryText: '#047857',
  onPrimary: BRAND.navy,

  positive: '#047857',
  positiveMuted: '#D1FAE5',
  negative: '#DC2626',
  negativeMuted: '#FEE2E2',
  warning: '#B45309',
  warningMuted: '#FEF3C7',

  overlay: 'rgba(16, 27, 45, 0.4)',
  shadow: 'rgba(16, 27, 45, 0.06)',

  heroStart: '#0F2A3D',
  heroEnd: '#0A5C47',
  heroText: '#F8FAFC',
  heroTextMuted: '#D5E2EE',
  heroPositive: '#6EE7B7',
  heroNegative: '#FECACA',
  heroSurface: 'rgba(255, 255, 255, 0.14)',
  heroTrack: 'rgba(255, 255, 255, 0.18)',
};

export const darkColors: ThemeColors = {
  background: BRAND.navy,
  surface: BRAND.slate,
  surfaceMuted: '#162033',
  surfaceHover: '#263449',
  border: '#334155',
  borderStrong: '#3E4C63',

  text: BRAND.ice,
  textSecondary: '#94A3B8',
  textTertiary: '#8B9CB3',
  textInverse: BRAND.navy,

  primary: BRAND.emerald,
  primaryPressed: '#0E9F70',
  primaryMuted: '#12352C',
  primaryText: BRAND.emerald,
  onPrimary: BRAND.navy,

  positive: BRAND.emerald,
  positiveMuted: '#12352C',
  negative: '#F87171',
  negativeMuted: '#3A1D24',
  warning: '#F59E0B',
  warningMuted: '#3A2E14',

  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.4)',

  heroStart: '#15304A',
  heroEnd: '#0A5C47',
  heroText: '#F8FAFC',
  heroTextMuted: '#D5E2EE',
  heroPositive: '#6EE7B7',
  heroNegative: '#FECACA',
  heroSurface: 'rgba(255, 255, 255, 0.14)',
  heroTrack: 'rgba(255, 255, 255, 0.18)',
};

export const colorsByScheme: Record<ColorScheme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};
