import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import {
  countsAsBudgetExpense,
  countsAsBudgetIncome,
  resolveTransactionKind,
} from '@/lib/domain/financial/transaction-kind';
import type { Transaction } from '@/lib/domain/transaction.types';
import { colors, radius, spacing } from '@/lib/theme';

export type MovementTab = 'all' | 'expense' | 'income' | 'transfer' | 'subscricoes';

export type MovementFilterCounts = Record<MovementTab, number>;

const CHIPS: Array<{
  key: MovementTab;
  label: string;
  icon: SymbolViewProps['name'];
}> = [
  {
    key: 'all',
    label: 'Todos',
    icon: { ios: 'list.bullet', android: 'list', web: 'list' },
  },
  {
    key: 'expense',
    label: 'Despesas',
    icon: { ios: 'arrow.down.circle.fill', android: 'south', web: 'south' },
  },
  {
    key: 'income',
    label: 'Receitas',
    icon: { ios: 'arrow.up.circle.fill', android: 'north', web: 'north' },
  },
  {
    key: 'transfer',
    label: 'Transferências',
    icon: { ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' },
  },
  {
    key: 'subscricoes',
    label: 'Despesas recorrentes',
    icon: { ios: 'repeat.circle.fill', android: 'autorenew', web: 'autorenew' },
  },
];

type MovementFilterChipsProps = {
  value: MovementTab;
  counts: MovementFilterCounts;
  onChange: (value: MovementTab) => void;
};

export function computeMovementFilterCounts(
  transactions: Transaction[],
  subscriptionCount: number,
): MovementFilterCounts {
  let expense = 0;
  let income = 0;
  let transfer = 0;

  for (const tx of transactions) {
    if (countsAsBudgetExpense(tx)) expense += 1;
    else if (countsAsBudgetIncome(tx)) income += 1;
    else if (resolveTransactionKind(tx) === 'transfer') transfer += 1;
  }

  return {
    all: transactions.length,
    expense,
    income,
    transfer,
    subscricoes: subscriptionCount,
  };
}

export function MovementFilterChips({ value, counts, onChange }: MovementFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {CHIPS.map((chip) => {
        const active = chip.key === value;
        const count = counts[chip.key];
        return (
          <Pressable
            key={chip.key}
            onPress={() => onChange(chip.key)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${chip.label}, ${count}`}>
            <SymbolView
              name={chip.icon}
              tintColor={active ? colors.background : colors.textSecondary}
              size={16}
            />
            <Text
              variant="bodyMedium"
              style={active ? styles.chipTextActive : styles.chipText}
              numberOfLines={1}>
              {chip.label} · {count}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
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
