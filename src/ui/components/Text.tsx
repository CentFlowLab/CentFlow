import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme, typography, type ThemeColors, type TypographyVariant } from '../theme';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'positive'
  | 'negative'
  | 'warning'
  | 'inverse'
  | 'onPrimary';

const toneToColor: Record<TextTone, keyof ThemeColors> = {
  primary: 'text',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  accent: 'primaryText',
  positive: 'positive',
  negative: 'negative',
  warning: 'warning',
  inverse: 'textInverse',
  onPrimary: 'onPrimary',
};

const HEADING_VARIANTS: readonly TypographyVariant[] = ['display', 'title1', 'title2', 'title3'];

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
  /** Algarismos de largura fixa, para valores alinhados em listas e tabelas. */
  tabular?: boolean;
};

export function Text({
  variant = 'body',
  tone = 'primary',
  align,
  tabular,
  style,
  accessibilityRole,
  ...rest
}: TextProps) {
  const { colors } = useTheme();
  const isHeading = HEADING_VARIANTS.includes(variant);

  return (
    <RNText
      accessibilityRole={accessibilityRole ?? (isHeading ? 'header' : undefined)}
      maxFontSizeMultiplier={isHeading ? 1.4 : 1.8}
      style={[
        typography[variant],
        { color: colors[toneToColor[tone]] },
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
      {...rest}
    />
  );
}
