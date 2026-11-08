import type { TextStyle } from 'react-native';

/** Nomes registados no carregamento de fontes (ver src/ui/theme/fonts.ts). */
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

type Variant = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'textTransform'
>;

export const typography = {
  display: { fontFamily: fontFamily.semibold, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  title1: { fontFamily: fontFamily.semibold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  title2: { fontFamily: fontFamily.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  title3: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24, letterSpacing: -0.1 },
  bodyStrong: { fontFamily: fontFamily.medium, fontSize: 16, lineHeight: 24, letterSpacing: -0.1 },
  callout: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22, letterSpacing: -0.1 },
  label: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20, letterSpacing: -0.05 },
  footnote: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  caption: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  overline: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  amountHero: {
    fontFamily: fontFamily.semibold,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.2,
  },
  amount: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
} satisfies Record<string, Variant>;

export type TypographyVariant = keyof typeof typography;
