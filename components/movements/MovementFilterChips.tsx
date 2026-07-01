import { ScrollView, StyleSheet, Pressable } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

export type MovementTab = 'all' | 'expense' | 'income' | 'subscricoes';

const CHIPS: Array<{ key: MovementTab; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'expense', label: 'Despesas' },
  { key: 'income', label: 'Receitas' },
  { key: 'subscricoes', label: 'Despesas recorrentes' },
];

type MovementFilterChipsProps = {
  value: MovementTab;
  onChange: (value: MovementTab) => void;
};

export function MovementFilterChips({ value, onChange }: MovementFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {CHIPS.map((chip) => {
        const active = chip.key === value;
        return (
          <Pressable
            key={chip.key}
            onPress={() => onChange(chip.key)}
            style={[styles.chip, active && styles.chipActive]}
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
    paddingHorizontal: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
});
