import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnalysisMetricCard } from '@/components/analysis/AnalysisMetricCard';
import { InsightsSection } from '@/components/analysis/InsightsSection';
import { TrendsSummaryCard } from '@/components/analysis/TrendsSummaryCard';
import { Card, Text } from '@/components/ui';
import type { AnalysisData } from '@/lib/domain/analysis.types';
import { calculateSavingsRate } from '@/lib/domain/financial/savings';
import { spacing } from '@/lib/theme';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

type AnalysisSummaryTabProps = {
  data: AnalysisData;
};

export function AnalysisSummaryTab({ data }: AnalysisSummaryTabProps) {
  const savings = useMemo(
    () => calculateSavingsRate(data.trends.totalIncome, data.trends.totalExpenses),
    [data.trends.totalIncome, data.trends.totalExpenses],
  );

  const topInsights = data.insights.slice(0, 3);
  const savingsMetric = data.metrics.find((m) => m.id === 'savings-rate');
  const cashflowMetric = data.metrics.find((m) => m.id === 'cashflow');

  return (
    <View style={styles.container}>
      <TrendsSummaryCard
        trends={data.trends}
        periodLabel={data.periodLabel}
        showNetWorthChange={false}
      />

      <View style={styles.metricsRow}>
        {cashflowMetric ? <AnalysisMetricCard metric={cashflowMetric} /> : null}
        {savingsMetric ? <AnalysisMetricCard metric={savingsMetric} /> : null}
      </View>

      <Card variant="elevated" style={styles.savingsCard}>
        <Text variant="caption" color="textMuted">
          Taxa de poupança
        </Text>
        <Text variant="h2">
          {formatPercent(Math.max(0, savings.rate ?? 0), 1, false)}
        </Text>
        <Text variant="caption" color="textSecondary">
          Receitas {formatCurrency(savings.income)} · Gastos {formatCurrency(savings.expenses)}
        </Text>
      </Card>

      <InsightsSection insights={topInsights} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  metricsRow: {
    gap: spacing.sm,
  },
  savingsCard: {
    gap: spacing.xs,
  },
});
