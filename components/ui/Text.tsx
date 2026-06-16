import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';

import { colors, typography, TypographyKey } from '@/lib/theme';

type TextColorKey = Exclude<keyof typeof colors, 'gradientPrimary' | 'gradientAccent' | 'gradientSurface'>;

type TextProps = RNTextProps & {
  variant?: TypographyKey;
  color?: TextColorKey | (string & {});
  align?: 'left' | 'center' | 'right';
};

function resolveTextColor(color: TextProps['color']): string {
  if (!color) return colors.text;
  if (color in colors) {
    const value = colors[color as keyof typeof colors];
    return typeof value === 'string' ? value : colors.text;
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
  const textColor = resolveTextColor(color);

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
