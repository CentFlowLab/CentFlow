import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import {
  AnalysisMetricCard,
  AnalysisSkeleton,
  InsightsSection,
  PatrimonyAllocationCard,
} from '@/components/analysis';
import { AppHeader } from '@/components/layout';
import { EmptyState, ScreenContainer, SectionHeader, Text } from '@/components/ui';
import { useAnalysisData } from '@/hooks/queries/useAnalysisData';
import { getApiErrorMessage } from '@/lib/api/errors';
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
          <EmptyState
            icon={
              <SymbolView
                name={{ ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' }}
                tintColor={colors.danger}
                size={32}
              />
            }
            title="Não foi possível carregar"
            description={getApiErrorMessage(error, 'as análises')}
            actionLabel="Tentar novamente"
            onAction={() => refetch()}
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

          {isRefetching && (
            <Text variant="caption" color="textMuted" align="center" style={styles.refetching}>
              A atualizar...
            </Text>
          )}
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
  refetching: {
    paddingBottom: spacing.lg,
  },
});
