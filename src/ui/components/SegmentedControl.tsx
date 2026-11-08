import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '../theme';
import { Text } from './Text';

export type SegmentedOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const { colors, scheme } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, { backgroundColor: colors.surfaceMuted }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              selected && {
                backgroundColor: scheme === 'dark' ? colors.borderStrong : colors.surface,
                boxShadow: scheme === 'light' ? `0 1px 3px ${colors.shadow}` : undefined,
              },
            ]}>
            <Text variant="label" tone={selected ? 'primary' : 'secondary'} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: spacing.xxs + 1,
    gap: spacing.xxs,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
