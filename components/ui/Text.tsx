import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';

import { colors, typography, TypographyKey } from '@/lib/theme';

type TextProps = RNTextProps & {
  variant?: TypographyKey;
  color?: keyof typeof colors | string;
  align?: 'left' | 'center' | 'right';
};

export function Text({
  variant = 'body',
  color = 'text',
  align,
  style,
  ...props
}: TextProps) {
  const textColor = color in colors ? colors[color as keyof typeof colors] : color;

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
