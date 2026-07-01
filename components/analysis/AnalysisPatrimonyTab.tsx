import { StyleSheet, View } from 'react-native';

import { AnalysisMetricCard } from '@/components/analysis/AnalysisMetricCard';
import { PatrimonyAllocationCard } from '@/components/analysis/PatrimonyAllocationCard';
import { Card, Text } from '@/components/ui';
import type { AnalysisData } from '@/lib/domain/analysis.types';
import { spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type AnalysisPatrimonyTabProps = {
  data: AnalysisData;
};

export function AnalysisPatrimonyTab({ data }: AnalysisPatrimonyTabProps) {
  const patrimonyMetrics = data.metrics.filter((metric) =>
    ['debt-ratio', 'investment-share', 'liquidity', 'inventory-share'].includes(metric.id),
  );

  return (
    <View style={styles.container}>
      <Card variant="elevated" style={styles.netWorthCard}>
        <Text variant="caption" color="textMuted">
          Património líquido
        </Text>
        <Text variant="h2">{formatCurrency(data.netWorth.netWorth)}</Text>
        <Text variant="caption" color="textSecondary">
          Ativos {formatCurrency(data.netWorth.totalAssets)} · Passivos{' '}
          {formatCurrency(data.netWorth.totalLiabilities)}
        </Text>
      </Card>

      {data.allocation.length > 0 ? (
        <PatrimonyAllocationCard
          allocation={data.allocation}
          totalAssets={data.netWorth.totalAssets}
        />
      ) : null}

      <View style={styles.metricsGrid}>
        {patrimonyMetrics.map((metric) => (
          <AnalysisMetricCard key={metric.id} metric={metric} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  netWorthCard: {
    gap: spacing.xs,
  },
  metricsGrid: {
    gap: spacing.sm,
  },
});
