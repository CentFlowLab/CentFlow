import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { buildSpendingCalendar, getSpendingDayDetail } from '@/lib/domain/financial/spending-calendar';
import type { Transaction } from '@/lib/domain/transaction.types';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type SpendingCalendarCardProps = {
  transactions: Transaction[];
  monthKey: string;
};

export function SpendingCalendarCard({ transactions, monthKey }: SpendingCalendarCardProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const cells = useMemo(
    () => buildSpendingCalendar(transactions, monthKey),
    [transactions, monthKey],
  );

  const detail = useMemo(() => {
    if (!selectedDay) return null;
    return getSpendingDayDetail(transactions, selectedDay);
  }, [selectedDay, transactions]);

  const [year, month] = monthKey.split('-').map(Number);
  const monthLabel = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );

  return (
    <Card variant="elevated" style={styles.card}>
      <Text variant="h3">Calendário de gastos</Text>
      <Text variant="caption" color="textMuted" style={styles.subtitle}>
        {monthLabel} · toque num dia para detalhe
      </Text>

      <View style={styles.grid}>
        {cells.map((cell) => (
          <Pressable
            key={cell.dayKey}
            onPress={() => setSelectedDay(cell.dayKey)}
            style={[
              styles.dayCell,
              selectedDay === cell.dayKey && styles.dayCellSelected,
              cell.amount > 0 && { backgroundColor: heatColor(cell.intensity) },
            ]}>
            <Text variant="caption" color={cell.amount > 0 ? 'textPrimary' : 'textMuted'}>
              {cell.day}
            </Text>
          </Pressable>
        ))}
      </View>

      {detail ? (
        <View style={styles.detail}>
          <Text variant="bodyMedium">
            {formatCurrency(detail.total)} · {detail.movementCount} movimento
            {detail.movementCount === 1 ? '' : 's'}
          </Text>
          {detail.topCategoryLabel ? (
            <Text variant="caption" color="textSecondary">
              Maior categoria: {detail.topCategoryLabel}
            </Text>
          ) : null}
          {detail.topMovement ? (
            <Text variant="caption" color="textMuted">
              Maior movimento: {detail.topMovement.description} (
              {formatCurrency(detail.topMovement.amount)})
            </Text>
          ) : null}
        </View>
      ) : (
        <Text variant="caption" color="textMuted">
          Sem dia seleccionado
        </Text>
      )}
    </Card>
  );
}

function heatColor(intensity: number): string {
  const alpha = 0.15 + intensity * 0.55;
  return `rgba(99, 102, 241, ${alpha})`;
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayCell: {
    width: '13%',
    minWidth: 36,
    aspectRatio: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCellSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  detail: {
    marginTop: spacing.sm,
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
