import { StyleSheet, View } from 'react-native';

import {
  AnalysisMetricCard,
  AnalysisSkeleton,
  InsightsSection,
  PatrimonyAllocationCard,
} from '@/components/analysis';
import { AppHeader } from '@/components/layout';
import {
  ErrorState,
  RefetchingIndicator,
  ScreenContainer,
  SectionHeader,
  Text,
} from '@/components/ui';
import { useAnalysisData } from '@/hooks/queries/useAnalysisData';
import { formatCurrency } from '@/lib/utils/format';
import { colors, spacing } from '@/lib/theme';

export default function AnalisesScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useAnalysisData();

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Análises"
        subtitle={data?.periodLabel ?? 'Insights sobre o teu património'}
      />

      {isLoading ? (
        <ScreenContainer>
          <AnalysisSkeleton />
        </ScreenContainer>
      ) : isError || !data ? (
        <View style={styles.centered}>
          <ErrorState
            context="analysis"
            error={error}
            onRetry={() => refetch()}
            retryLoading={isRefetching}
          />
        </View>
      ) : (
        <ScreenContainer>
          {/* Resumo património */}
          <SectionHeader
            title="Património"
            subtitle={`Líquido: ${formatCurrency(data.netWorth.netWorth)}`}
          />

          <PatrimonyAllocationCard
            allocation={data.allocation}
            totalAssets={data.netWorth.totalAssets}
          />

          {/* Métricas principais */}
          <SectionHeader
            title="Métricas"
            subtitle="Indicadores chave do período"
          />
          <View style={styles.metricsGrid}>
            {data.metrics.map((metric) => (
              <AnalysisMetricCard key={metric.id} metric={metric} />
            ))}
          </View>

          {/* Variação resumo */}
          <View style={styles.summaryRow}>
            <SummaryPill
              label="Passivos"
              value={formatCurrency(data.netWorth.totalLiabilities)}
              color={colors.danger}
            />
            <SummaryPill
              label="Ativos"
              value={formatCurrency(data.netWorth.totalAssets)}
              color={colors.success}
            />
          </View>

          {/* CentFlow Brain */}
          <InsightsSection insights={data.insights} />

          <RefetchingIndicator visible={isRefetching} />
        </ScreenContainer>
      )}
    </View>
  );
}

function SummaryPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[styles.pill, { borderColor: `${color}40` }]}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ color }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  pill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
