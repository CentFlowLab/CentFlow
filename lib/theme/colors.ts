export const colors = {
  background: '#080C12',
  backgroundElevated: '#0D1219',
  surface: '#121820',
  surfaceElevated: '#1A2330',
  surfaceHighlight: '#222D3D',

  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',

  primary: '#2DD4BF',
  primaryMuted: 'rgba(45, 212, 191, 0.15)',
  primaryDark: '#14B8A6',

  accent: '#F5C451',
  accentMuted: 'rgba(245, 196, 81, 0.12)',

  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#080C12',

  success: '#34D399',
  successMuted: 'rgba(52, 211, 153, 0.12)',
  danger: '#F87171',
  dangerMuted: 'rgba(248, 113, 113, 0.12)',
  warning: '#FBBF24',

  tabBar: '#0A0F16',
  tabBarBorder: 'rgba(255, 255, 255, 0.06)',

  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ColorKey = keyof typeof colors;
