import { Text as RNText, TextProps as RNTextProps } from 'react-native';

import { typography, TypographyKey, useTheme } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme/types';

type TextColorKey = Exclude<
  keyof ThemeColors,
  'gradientPrimary' | 'gradientAccent' | 'gradientSurface'
>;

type TextProps = RNTextProps & {
  variant?: TypographyKey;
  color?: TextColorKey | (string & {});
  align?: 'left' | 'center' | 'right';
};

function resolveTextColor(color: TextProps['color'], palette: ThemeColors): string {
  if (!color) return palette.text;
  if (color in palette) {
    const value = palette[color as keyof ThemeColors];
    return typeof value === 'string' ? value : palette.text;
  }
  return color;
}

export function Text({
  variant = 'body',
  color = 'text',
  align,
  style,
  ...props
}: TextProps) {
  const { colors } = useTheme();
  const textColor = resolveTextColor(color, colors);

  return (
    <RNText
      style={[
        typography[variant],
        { color: textColor },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...props}
    />
  );
}

export function Label(props: Omit<TextProps, 'variant'>) {
  return <Text variant="label" color="textMuted" {...props} />;
}
