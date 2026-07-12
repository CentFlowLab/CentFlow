import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { layout, radius, spacing, useTheme, useThemedStyles } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme/types';

import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

function getVariantStyles(colors: ThemeColors): Record<
  ButtonVariant,
  { bg: string; text: string; border?: string }
> {
  return {
    primary: { bg: colors.primary, text: colors.textInverse },
    secondary: {
      bg: colors.surfaceElevated,
      text: colors.text,
      border: colors.borderStrong,
    },
    ghost: { bg: 'transparent', text: colors.primary },
    danger: { bg: colors.dangerMuted, text: colors.danger },
    success: { bg: colors.success, text: colors.textInverse },
  };
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const variantStyles = useMemo(() => getVariantStyles(colors), [colors]);
  const isDisabled = disabled || loading;
  const variantStyle = variantStyles[variant];
  const height = layout.buttonHeight[size];

  const content = (
    <View style={[styles.content, { height }]}>
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary' || variant === 'success'
              ? colors.textInverse
              : colors.primary
          }
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text
            variant="bodyMedium"
            color={variantStyle.text}
            style={styles.label}>
            {label}
          </Text>
        </>
      )}
    </View>
  );

  if (variant === 'primary' || variant === 'success') {
    const gradientColors =
      variant === 'success'
        ? ([colors.success, '#10B981'] as const)
        : ([colors.primary, colors.primaryDark] as const);

    return (
      <Pressable
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          fullWidth && styles.fullWidth,
          {
            opacity: isDisabled ? 0.5 : pressed ? 0.92 : 1,
            transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
          },
          style,
        ]}
        {...props}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { borderRadius: radius.md }]}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: variantStyle.bg,
          borderColor: variantStyle.border,
          borderWidth: variantStyle.border ? 1 : 0,
          borderRadius: radius.md,
          opacity: isDisabled ? 0.5 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        style,
      ]}
      {...props}>
      {content}
    </Pressable>
  );
}

function createStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    base: {
      overflow: 'hidden',
    },
    fullWidth: {
      width: '100%',
    },
    gradient: {
      overflow: 'hidden',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
    },
    label: {
      fontWeight: '600',
    },
  });
}
