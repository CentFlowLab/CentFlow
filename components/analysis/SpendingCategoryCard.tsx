import { StyleSheet, View } from 'react-native';

import { DonutChart, type DonutSegment } from '@/components/charts';
import { Card, Text } from '@/components/ui';
import type { SpendingCategorySlice } from '@/lib/domain/analysis.types';
import { getSpendingChartColors } from '@/lib/domain/analysis.compose';
import { formatCurrency, formatPercent } from '@/lib/utils/format';
import { colors, spacing } from '@/lib/theme';

type SpendingCategoryCardProps = {
  categories: SpendingCategorySlice[];
  periodLabel: string;
};

export function SpendingCategoryCard({ categories, periodLabel }: SpendingCategoryCardProps) {
  const palette = getSpendingChartColors();
  const total = categories.reduce((sum, item) => sum + item.amount, 0);

  const segments: DonutSegment[] = categories.map((item, index) => ({
    value: item.amount,
    color: palette[index % palette.length],
    label: item.label,
  }));

  if (categories.length === 0) {
    return (
      <Card variant="elevated" style={styles.card}>
        <Text variant="h3" style={styles.title}>
          Gastos por categoria
        </Text>
        <Text variant="body" color="textSecondary" align="center" style={styles.emptyText}>
          Regista despesas nos últimos 30 dias para ver a distribuição por categoria.
        </Text>
      </Card>
    );
  }

  return (
    <Card variant="elevated" style={styles.card}>
      <Text variant="h3" style={styles.title}>
        Gastos por categoria
      </Text>
      <Text variant="caption" color="textMuted" style={styles.subtitle}>
        {periodLabel}
      </Text>

      <View style={styles.chartRow}>
        <DonutChart
          segments={segments}
          size={150}
          strokeWidth={18}
          centerValue={formatCurrency(total)}
          centerLabel="Total gastos"
        />

        <View style={styles.legend}>
          {categories.map((item, index) => {
            const percent = total > 0 ? (item.amount / total) * 100 : 0;
            const color = palette[index % palette.length];

            return (
              <View key={item.key} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <View style={styles.legendText}>
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {formatCurrency(item.amount)} · {formatPercent(percent, 0, false)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing['2xl'],
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  legend: {
    flex: 1,
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    flex: 1,
    gap: 2,
  },
  emptyText: {
    paddingVertical: spacing['2xl'],
  },
});
