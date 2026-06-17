/**
 * Paleta dark premium CentFlow — versão refinada.
 * Teal como cor primária, gold como destaque, superfícies com profundidade.
 */
export const colors = {
  background: '#05080E',
  backgroundElevated: '#0A1018',
  surface: '#101820',
  surfaceElevated: '#172230',
  surfaceHighlight: '#1E2A3A',

  border: 'rgba(255, 255, 255, 0.07)',
  borderStrong: 'rgba(255, 255, 255, 0.12)',

  primary: '#2DD4BF',
  primaryMuted: 'rgba(45, 212, 191, 0.14)',
  primaryDark: '#14B8A6',
  primaryGlow: 'rgba(45, 212, 191, 0.35)',

  accent: '#F0C14D',
  accentMuted: 'rgba(240, 193, 77, 0.14)',

  text: '#F8FAFC',
  textSecondary: '#A8B4C4',
  textMuted: '#78859A',
  textInverse: '#05080E',

  success: '#34D399',
  successMuted: 'rgba(52, 211, 153, 0.12)',
  danger: '#F87171',
  dangerMuted: 'rgba(248, 113, 113, 0.12)',
  warning: '#FBBF24',

  tabBar: '#080D14',
  tabBarBorder: 'rgba(255, 255, 255, 0.05)',

  overlay: 'rgba(0, 0, 0, 0.65)',

  /** Gradientes para cards premium */
  gradientPrimary: ['#2DD4BF', '#14B8A6'] as const,
  gradientAccent: ['#F0C14D', '#D4A017'] as const,
  gradientSurface: ['#172230', '#101820'] as const,
} as const;

export type ColorKey = keyof typeof colors;
