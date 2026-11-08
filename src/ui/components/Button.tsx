import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { layout, radius, spacing, useTheme, type ThemeColors } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
};

const VARIANT_COLORS: Record<
  ButtonVariant,
  { background: keyof ThemeColors | null; pressed: keyof ThemeColors; text: keyof ThemeColors }
> = {
  primary: { background: 'primary', pressed: 'primaryPressed', text: 'onPrimary' },
  secondary: { background: 'surfaceMuted', pressed: 'border', text: 'text' },
  ghost: { background: null, pressed: 'surfaceMuted', text: 'primaryText' },
  destructive: { background: 'negativeMuted', pressed: 'negativeMuted', text: 'negative' },
};

const SIZES: Record<ButtonSize, { height: number; paddingHorizontal: number; iconSize: number }> = {
  sm: { height: 36, paddingHorizontal: spacing.md, iconSize: 16 },
  md: { height: layout.minTouchTarget, paddingHorizontal: spacing.lg, iconSize: 18 },
  lg: { height: 52, paddingHorizontal: spacing.xl, iconSize: 20 },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const palette = VARIANT_COLORS[variant];
  const dimensions = SIZES[size];
  const isDisabled = Boolean(disabled) || loading;
  const textColor = colors[palette.text];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={size === 'sm' ? 4 : 0}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: dimensions.height,
          paddingHorizontal: dimensions.paddingHorizontal,
          backgroundColor: pressed
            ? colors[palette.pressed]
            : palette.background
              ? colors[palette.background]
              : 'transparent',
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      {...rest}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : icon ? (
          <Icon name={icon} size={dimensions.iconSize} colorValue={textColor} />
        ) : null}
        <Text variant="label" style={{ color: textColor }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
