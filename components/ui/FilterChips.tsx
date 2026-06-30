import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { colors, pressScale, radius, spacing } from '@/lib/theme';

import { Text } from './Text';

export type FilterChip<T extends string = string> = {
  key: T;
  label: string;
};

type FilterChipsProps<T extends string> = {
  chips: FilterChip<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Quando false, não aplica padding horizontal (útil se o pai já tem padding). */
  padded?: boolean;
  /** Espaço inferior após a fila de chips. */
  bottomSpacing?: boolean;
};

export function FilterChips<T extends string>({
  chips,
  value,
  onChange,
  padded = true,
  bottomSpacing = false,
}: FilterChipsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.container,
        padded && styles.padded,
        bottomSpacing && styles.bottomSpacing,
      ]}>
      {chips.map((chip) => {
        const active = chip.key === value;
        return (
          <Pressable
            key={chip.key}
            onPress={() => onChange(chip.key)}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={chip.label}>
            <Text
              variant="bodyMedium"
              style={active ? styles.chipTextActive : styles.chipText}>
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
  bottomSpacing: {
    paddingBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.9,
    transform: [{ scale: pressScale.chip }],
  },
  chipText: {
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
});
