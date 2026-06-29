import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

type AnalysisTabKey = 'resumo' | 'gastos' | 'divida' | 'patrimonio';

const TABS: Array<{ key: AnalysisTabKey; label: string }> = [
  { key: 'resumo', label: 'Resumo' },
  { key: 'gastos', label: 'Gastos' },
  { key: 'divida', label: 'Dívida' },
  { key: 'patrimonio', label: 'Património' },
];

type AnalysisTabChipsProps = {
  value: AnalysisTabKey;
  onChange: (value: AnalysisTabKey) => void;
};

export function AnalysisTabChips({ value, onChange }: AnalysisTabChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {TABS.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.chip, active && styles.chipActive]}>
            <Text variant="bodyMedium" style={active ? styles.chipTextActive : styles.chipText}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export type { AnalysisTabKey };

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    color: colors.textSecondary,
    overflow: 'hidden',
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
