import { Pressable, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { radius, spacing, useTheme, type Spacing } from '../theme';

type Props = ViewProps & {
  padding?: Spacing;
  /** Torna o cartão interativo (feedback visual ao toque). */
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function Card({
  padding = 'lg',
  onPress,
  style,
  children,
  accessibilityLabel,
  ...rest
}: Props) {
  const { colors, scheme } = useTheme();
  const base: StyleProp<ViewStyle> = {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[padding],
    boxShadow:
      scheme === 'light' ? `0 1px 2px ${colors.shadow}, 0 8px 24px ${colors.shadow}` : undefined,
  };

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [
          base,
          pressed && { backgroundColor: colors.surfaceHover, transform: [{ scale: 0.995 }] },
          style,
        ]}
        {...rest}>
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[base, style]} accessibilityLabel={accessibilityLabel} {...rest}>
      {children}
    </View>
  );
}
