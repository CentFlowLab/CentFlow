import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import {
  budgetMonthFromDateString,
  budgetMonthOptions,
  nextBudgetMonth,
  parseBudgetMonthLabel,
  shouldSuggestNextBudgetMonth,
} from '@/lib/domain/budget-month';
import { colors, radius, spacing } from '@/lib/theme';

type BudgetMonthFieldProps = {
  date: string;
  category: string;
  value?: string;
  onChange: (value: string) => void;
};

export function BudgetMonthField({ date, category, value, onChange }: BudgetMonthFieldProps) {
  const resolvedValue = value ?? budgetMonthFromDateString(date);
  const options = useMemo(() => budgetMonthOptions(new Date(`${date.slice(0, 10)}T12:00:00`), 4), [date]);
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false);

  useEffect(() => {
    setDismissedSuggestion(false);
  }, [date, category]);

  const showSuggestion =
    !dismissedSuggestion && shouldSuggestNextBudgetMonth(date, category) && resolvedValue !== nextBudgetMonth(date);

  return (
    <View style={styles.container}>
      <Text variant="label">Mês financeiro</Text>
      <Text variant="caption" color="textMuted" style={styles.helper}>
        Útil quando recebes no fim do mês dinheiro destinado ao mês seguinte.
      </Text>

      <View style={styles.chips}>
        {options.map((option) => {
          const active = option === resolvedValue;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}>
              <Text variant="caption" color={active ? 'primary' : 'textSecondary'}>
                {parseBudgetMonthLabel(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showSuggestion ? (
        <Card variant="outlined" padding="md" style={styles.suggestion}>
          <Text variant="bodyMedium">Queres associar este rendimento ao próximo mês?</Text>
          <View style={styles.suggestionActions}>
            <Pressable
              onPress={() => {
                onChange(nextBudgetMonth(date));
                setDismissedSuggestion(true);
              }}
              style={styles.suggestionButton}>
              <Text variant="caption" color="primary">
                Sim, {parseBudgetMonthLabel(nextBudgetMonth(date))}
              </Text>
            </Pressable>
            <Pressable onPress={() => setDismissedSuggestion(true)}>
              <Text variant="caption" color="textMuted">
                Manter {parseBudgetMonthLabel(resolvedValue)}
              </Text>
            </Pressable>
          </View>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  helper: {
    marginTop: -spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  suggestion: {
    gap: spacing.sm,
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  suggestionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    alignItems: 'center',
  },
  suggestionButton: {
    paddingVertical: spacing.xs,
  },
});
