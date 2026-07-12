import type { ThemeDefinition, ThemeId } from './types';

/** Classic — paleta actual da CentFlow (Dark Premium), inalterada. */
export const classicTheme: ThemeDefinition = {
  id: 'classic',
  name: 'Classic',
  description: 'Teal e gold — o visual original da CentFlow.',
  previewBackground: '#05080E',
  previewAccent: '#2DD4BF',
  colors: {
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

    gradientPrimary: ['#2DD4BF', '#14B8A6'],
    gradientAccent: ['#F0C14D', '#D4A017'],
    gradientSurface: ['#172230', '#101820'],
  },
};

export const midnightIndigoTheme: ThemeDefinition = {
  id: 'midnight-indigo',
  name: 'Midnight Indigo',
  description: 'Noite profunda com acentos índigo e violeta suaves.',
  previewBackground: '#0D0E1A',
  previewAccent: '#8B93FF',
  colors: {
    background: '#0D0E1A',
    backgroundElevated: '#121322',
    surface: '#151726',
    surfaceElevated: '#1C1E32',
    surfaceHighlight: '#242742',

    border: 'rgba(139, 147, 255, 0.08)',
    borderStrong: 'rgba(139, 147, 255, 0.14)',

    primary: '#8B93FF',
    primaryMuted: 'rgba(139, 147, 255, 0.16)',
    primaryDark: '#6E78F0',
    primaryGlow: 'rgba(139, 147, 255, 0.34)',

    accent: '#B4A0FF',
    accentMuted: 'rgba(180, 160, 255, 0.14)',

    text: '#F4F5FF',
    textSecondary: '#B4B8D4',
    textMuted: '#7E84A8',
    textInverse: '#0D0E1A',

    success: '#5EEAD4',
    successMuted: 'rgba(94, 234, 212, 0.12)',
    danger: '#FB7185',
    dangerMuted: 'rgba(251, 113, 133, 0.12)',
    warning: '#FCD34D',

    tabBar: '#0A0B16',
    tabBarBorder: 'rgba(139, 147, 255, 0.06)',

    overlay: 'rgba(5, 6, 14, 0.72)',

    gradientPrimary: ['#8B93FF', '#6E78F0'],
    gradientAccent: ['#B4A0FF', '#9580F5'],
    gradientSurface: ['#1C1E32', '#151726'],
  },
};

export const warmGraphiteTheme: ThemeDefinition = {
  id: 'warm-graphite',
  name: 'Warm Graphite',
  description: 'Carvão quente com acentos âmbar e dourado suaves.',
  previewBackground: '#1A1816',
  previewAccent: '#E8B86D',
  colors: {
    background: '#1A1816',
    backgroundElevated: '#201D1A',
    surface: '#252220',
    surfaceElevated: '#2D2926',
    surfaceHighlight: '#36312D',

    border: 'rgba(232, 184, 109, 0.08)',
    borderStrong: 'rgba(232, 184, 109, 0.14)',

    primary: '#E8B86D',
    primaryMuted: 'rgba(232, 184, 109, 0.14)',
    primaryDark: '#D4A04A',
    primaryGlow: 'rgba(232, 184, 109, 0.32)',

    accent: '#F0C878',
    accentMuted: 'rgba(240, 200, 120, 0.14)',

    text: '#F7F2EA',
    textSecondary: '#C8BFB2',
    textMuted: '#8E857A',
    textInverse: '#1A1816',

    success: '#6EE7A8',
    successMuted: 'rgba(110, 231, 168, 0.12)',
    danger: '#F87171',
    dangerMuted: 'rgba(248, 113, 113, 0.12)',
    warning: '#FBBF24',

    tabBar: '#161412',
    tabBarBorder: 'rgba(232, 184, 109, 0.06)',

    overlay: 'rgba(12, 10, 8, 0.72)',

    gradientPrimary: ['#E8B86D', '#D4A04A'],
    gradientAccent: ['#F0C878', '#DDB85A'],
    gradientSurface: ['#2D2926', '#252220'],
  },
};

export const deepEmeraldTheme: ThemeDefinition = {
  id: 'deep-emerald',
  name: 'Deep Emerald',
  description: 'Verde-petróleo profundo com acentos esmeralda vivos.',
  previewBackground: '#0E1A16',
  previewAccent: '#34D399',
  colors: {
    background: '#0E1A16',
    backgroundElevated: '#12221C',
    surface: '#163028',
    surfaceElevated: '#1A3A30',
    surfaceHighlight: '#214438',

    border: 'rgba(52, 211, 153, 0.08)',
    borderStrong: 'rgba(52, 211, 153, 0.14)',

    primary: '#34D399',
    primaryMuted: 'rgba(52, 211, 153, 0.14)',
    primaryDark: '#10B981',
    primaryGlow: 'rgba(52, 211, 153, 0.34)',

    accent: '#6EE7B7',
    accentMuted: 'rgba(110, 231, 183, 0.14)',

    text: '#ECFDF5',
    textSecondary: '#A7D4C0',
    textMuted: '#6B9A88',
    textInverse: '#0E1A16',

    success: '#4ADE80',
    successMuted: 'rgba(74, 222, 128, 0.12)',
    danger: '#FB7185',
    dangerMuted: 'rgba(251, 113, 133, 0.12)',
    warning: '#FACC15',

    tabBar: '#0A1410',
    tabBarBorder: 'rgba(52, 211, 153, 0.06)',

    overlay: 'rgba(6, 12, 10, 0.72)',

    gradientPrimary: ['#34D399', '#10B981'],
    gradientAccent: ['#6EE7B7', '#34D399'],
    gradientSurface: ['#1A3A30', '#163028'],
  },
};

export const THEME_DEFINITIONS: ThemeDefinition[] = [
  classicTheme,
  midnightIndigoTheme,
  warmGraphiteTheme,
  deepEmeraldTheme,
];

export const DEFAULT_THEME_ID: ThemeId = 'classic';

const themeById: Record<ThemeId, ThemeDefinition> = {
  classic: classicTheme,
  'midnight-indigo': midnightIndigoTheme,
  'warm-graphite': warmGraphiteTheme,
  'deep-emerald': deepEmeraldTheme,
};

export function normalizeThemeId(value: string | null | undefined): ThemeId {
  if (value === 'midnight-indigo' || value === 'warm-graphite' || value === 'deep-emerald') {
    return value;
  }
  if (value === 'classic') return 'classic';
  // Legado Supabase
  if (value === 'dark-premium' || value === 'dark-classic') return 'classic';
  return DEFAULT_THEME_ID;
}

export function getThemeDefinition(themeId: ThemeId): ThemeDefinition {
  return themeById[themeId] ?? classicTheme;
}

export function getThemeColors(themeId: ThemeId) {
  return getThemeDefinition(themeId).colors;
}
