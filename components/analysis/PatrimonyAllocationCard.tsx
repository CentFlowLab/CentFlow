import { StyleSheet, View } from 'react-native';

import { DonutChart, type DonutSegment } from '@/components/charts';
import { Card, Text } from '@/components/ui';
import type { AssetCategoryBreakdown } from '@/lib/domain';
import { formatCurrency, formatPercent } from '@/lib/utils/format';
import { colors, spacing } from '@/lib/theme';

const CATEGORY_COLORS: Record<string, string> = {
  accounts: colors.primary,
  inventory: colors.accent,
  investments: colors.success,
};

const CATEGORY_LABELS: Record<string, string> = {
  accounts: 'Contas',
  inventory: 'Inventário',
  investments: 'Investimentos',
};

type PatrimonyAllocationCardProps = {
  allocation: AssetCategoryBreakdown[];
  totalAssets: number;
};

export function PatrimonyAllocationCard({
  allocation,
  totalAssets,
}: PatrimonyAllocationCardProps) {
  const segments: DonutSegment[] = allocation.map((item) => ({
    value: item.value,
    color: CATEGORY_COLORS[item.key] ?? colors.textMuted,
    label: item.label,
  }));

  if (allocation.length === 0) {
    return (
      <Card variant="elevated" style={styles.card}>
        <Text variant="h3" style={styles.title}>
          Alocação de património
        </Text>
        <Text variant="body" color="textSecondary" align="center" style={styles.emptyText}>
          Adiciona contas, inventário ou investimentos para ver a distribuição.
        </Text>
      </Card>
    );
  }

  return (
    <Card variant="elevated" style={styles.card}>
      <Text variant="h3" style={styles.title}>
        Alocação de património
      </Text>
      <Text variant="caption" color="textMuted" style={styles.subtitle}>
        Distribuição dos teus ativos
      </Text>

      <View style={styles.chartRow}>
        <DonutChart
          segments={segments}
          size={160}
          strokeWidth={20}
          centerValue={formatCurrency(totalAssets)}
          centerLabel="Total ativos"
        />

        <View style={styles.legend}>
          {allocation.map((item) => {
            const percent = totalAssets > 0 ? (item.value / totalAssets) * 100 : 0;
            const color = CATEGORY_COLORS[item.key] ?? colors.textMuted;

            return (
              <View key={item.key} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <View style={styles.legendText}>
                  <Text variant="bodyMedium">
                    {CATEGORY_LABELS[item.key] ?? item.label}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {formatCurrency(item.value)} · {formatPercent(percent, 0, false)}
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
    gap: spacing.md,
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
    paddingVertical: spacing['3xl'],
  },
});
