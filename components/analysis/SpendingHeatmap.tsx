import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, SectionHeader, Text } from '@/components/ui';
import {
  computeSpendingHeatmap,
  filterTransactionsByDate,
  type HeatmapDay,
} from '@/lib/insights/category-breakdown';
import type { Transaction } from '@/lib/domain/transaction.types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

const LEVEL_COLOR: Record<HeatmapDay['level'], string> = {
  future: colors.surfaceHighlight,
  none: colors.successMuted,
  low: '#2d5a3d',
  medium: colors.accentMuted,
  high: '#b45309',
  veryHigh: colors.dangerMuted,
};

type SpendingHeatmapProps = {
  transactions: Transaction[];
  referenceDate?: Date;
};

export function SpendingHeatmap({ transactions, referenceDate = new Date() }: SpendingHeatmapProps) {
  const [offset, setOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const viewDate = useMemo(() => {
    const d = new Date(referenceDate);
    d.setMonth(d.getMonth() + offset);
    return d;
  }, [referenceDate, offset]);

  const heatmap = useMemo(
    () => computeSpendingHeatmap(transactions, viewDate),
    [transactions, viewDate],
  );

  const selectedTxs = useMemo(() => {
    if (!selectedDate) return [];
    return filterTransactionsByDate(transactions, selectedDate).filter(
      (tx) => tx.type === 'expense',
    );
  }, [selectedDate, transactions]);

  const monthTitle =
    heatmap.monthLabel.charAt(0).toUpperCase() + heatmap.monthLabel.slice(1);

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Heatmap de gastos" subtitle={monthTitle} />
      <Card variant="outlined" style={styles.card}>
        <View style={styles.nav}>
          <Pressable onPress={() => setOffset((o) => o - 1)} accessibilityLabel="Mês anterior">
            <Text variant="bodyMedium" color="primary">
              ←
            </Text>
          </Pressable>
          <Pressable onPress={() => setOffset(0)} disabled={offset === 0}>
            <Text variant="caption" color="textMuted">
              Hoje
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setOffset((o) => o + 1)}
            disabled={offset >= 0}
            accessibilityLabel="Mês seguinte">
            <Text variant="bodyMedium" color={offset >= 0 ? 'textMuted' : 'primary'}>
              →
            </Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          {heatmap.days.map((day) => (
            <Pressable
              key={day.date}
              disabled={day.isFuture}
              onPress={() => setSelectedDate(day.date)}
              style={[
                styles.cell,
                {
                  backgroundColor: LEVEL_COLOR[day.level],
                  opacity: selectedDate === day.date ? 1 : day.isFuture ? 0.35 : 0.95,
                },
              ]}>
              <Text variant="caption" color="text">
                {day.day}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.legend}>
          <LegendDot color={LEVEL_COLOR.none} label="<10€" />
          <LegendDot color={LEVEL_COLOR.medium} label="10-50€" />
          <LegendDot color={LEVEL_COLOR.high} label="50-150€" />
          <LegendDot color={LEVEL_COLOR.veryHigh} label=">150€" />
        </View>

        {selectedDate && selectedTxs.length > 0 ? (
          <View style={styles.detail}>
            <Text variant="label" color="textMuted">
              {formatDateShort(selectedDate)}
            </Text>
            {selectedTxs.map((tx) => (
              <Text key={tx.id} variant="caption" color="textSecondary">
                {tx.description ?? tx.categoryLabel} — {formatCurrency(tx.amount)}
              </Text>
            ))}
          </View>
        ) : null}
      </Card>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  card: {
    padding: spacing.md,
    gap: spacing.md,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  cell: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  detail: {
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
});
