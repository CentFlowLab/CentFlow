import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { FinancialActionsCard } from '@/components/budget';
import { AnalysisMetricCard } from '@/components/analysis/AnalysisMetricCard';
import { CashflowProjectionCard } from '@/components/analysis/CashflowProjectionCard';
import { InsightsSection } from '@/components/analysis/InsightsSection';
import { TrendsSummaryCard } from '@/components/analysis/TrendsSummaryCard';
import { Card, Text } from '@/components/ui';
import { useMonthlySpendable } from '@/hooks/useMonthlySpendable';
import type { AnalysisData } from '@/lib/domain/analysis.types';
import { calculateSavingsRate } from '@/lib/domain/financial/savings';
import { spacing } from '@/lib/theme';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

type AnalysisSummaryTabProps = {
  data: AnalysisData;
};

export function AnalysisSummaryTab({ data }: AnalysisSummaryTabProps) {
  const spendable = useMonthlySpendable();
  const { width: windowWidth } = useWindowDimensions();
  const savings = useMemo(
    () => calculateSavingsRate(data.trends.totalIncome, data.trends.totalExpenses),
    [data.trends.totalIncome, data.trends.totalExpenses],
  );

  const topInsights = data.insights.slice(0, 3); // 1 prioritário + até 2 secundários
  const savingsMetric = data.metrics.find((m) => m.id === 'savings-rate');
  const cashflowMetric = data.metrics.find((m) => m.id === 'cashflow');

  return (
    <View style={styles.container}>
      <TrendsSummaryCard
        trends={data.trends}
        periodLabel={data.periodLabel}
        showNetWorthChange={false}
      />

      <CashflowProjectionCard width={windowWidth - spacing.lg * 2} />

      <View style={styles.metricsRow}>
        {cashflowMetric ? <AnalysisMetricCard metric={cashflowMetric} /> : null}
        {savingsMetric ? <AnalysisMetricCard metric={savingsMetric} /> : null}
      </View>

      <Card variant="elevated" style={styles.savingsCard}>
        <Text variant="caption" color="textMuted">
          Taxa de poupança
        </Text>
        <Text variant="h2" color={savings.rate != null && savings.rate < 0 ? 'danger' : 'text'}>
          {savings.rate == null
            ? 'Sem dados suficientes'
            : formatPercent(savings.rate, 1, false)}
        </Text>
        <Text variant="caption" color="textSecondary">
          Receitas {formatCurrency(savings.income)} · Gastos {formatCurrency(savings.expenses)}
        </Text>
      </Card>

      <Card variant="outlined" style={styles.budgetContextCard}>
        <Text variant="caption" color="textMuted">
          Orçamento vs património
        </Text>
        <Text variant="bodyMedium">
          Gastos do mês: {formatCurrency(spendable.consumptionSpending)} (inclui cartão)
        </Text>
        <Text variant="bodyMedium">
          Disponível para gastar: {formatCurrency(spendable.available)}
        </Text>
        <Text variant="caption" color="textSecondary">
          Investimentos e poupança entram no património, não no orçamento mensal.
        </Text>
      </Card>

      <FinancialActionsCard maxActions={4} title="Próximos passos" />

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
  budgetContextCard: {
    gap: spacing.xs,
  },
  savingsCard: {
    gap: spacing.xs,
  },
});
