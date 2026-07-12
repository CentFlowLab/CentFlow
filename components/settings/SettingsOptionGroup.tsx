import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { radius, spacing, useThemedStyles } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme/types';

type SettingsOptionGroupProps<T extends string> = {
  title: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
};

export function SettingsOptionGroup<T extends string>({
  title,
  options,
  value,
  onChange,
  disabled,
}: SettingsOptionGroupProps<T>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.group}>
      <Text variant="label" color="textMuted">
        {title}
      </Text>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <Pressable
              key={option.id}
              disabled={disabled}
              onPress={() => onChange(option.id)}
              style={[
                styles.option,
                selected && styles.optionSelected,
                disabled && styles.optionDisabled,
              ]}>
              <Text variant="bodyMedium" color={selected ? 'primary' : 'textSecondary'}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    group: {
      gap: spacing.sm,
    },
    options: {
      gap: spacing.sm,
    },
    option: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    optionDisabled: {
      opacity: 0.6,
    },
  });
}
