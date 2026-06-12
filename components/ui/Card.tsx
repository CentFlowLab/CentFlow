import { Pressable, StyleSheet, View, ViewProps } from 'react-native';

import { colors, radius, spacing } from '@/lib/theme';

type CardProps = ViewProps & {
  variant?: 'default' | 'elevated' | 'outlined';
  onPress?: () => void;
  padding?: keyof typeof spacing | number;
};

export function Card({
  variant = 'default',
  onPress,
  padding = 'lg',
  style,
  children,
  ...props
}: CardProps) {
  const paddingValue = typeof padding === 'number' ? padding : spacing[padding];

  const cardStyle = [
    styles.base,
    variant === 'elevated' && styles.elevated,
    variant === 'outlined' && styles.outlined,
    { padding: paddingValue },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
        {...props}>
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
