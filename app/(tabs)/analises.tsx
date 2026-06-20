import { StyleSheet, View } from 'react-native';

import {
  AnalysisMetricCard,
  AnalysisSkeleton,
  InsightsSection,
  PricesInsightsSection,
  SpendingCategoryCard,
  TrendsSummaryCard,
} from '@/components/analysis';
import { AppHeader } from '@/components/layout';
import {
  ErrorState,
  RefetchingIndicator,
  ScreenContainer,
  SectionHeader,
} from '@/components/ui';
import { useAnalysisData } from '@/hooks/queries/useAnalysisData';
import { usePricesData } from '@/hooks/queries/usePricesData';
import { router } from 'expo-router';
import { spacing, colors } from '@/lib/theme';

export default function AnalisesScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useAnalysisData();
  const { data: pricesData } = usePricesData();

  return (
    <View style={styles.screen}>
      <AppHeader />

      {isLoading ? (
        <ScreenContainer applyBottomSafeInset={false}>
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
        <ScreenContainer applyBottomSafeInset={false}>
          <SectionHeader title="Análises" subtitle={data.periodLabel} />

          <TrendsSummaryCard
            trends={data.trends}
            periodLabel={data.periodLabel}
            showNetWorthChange={false}
          />

          <SpendingCategoryCard
            categories={data.trends.spendingByCategory}
            periodLabel={data.periodLabel}
          />

          <SectionHeader
            title="Métricas"
            subtitle="Indicadores chave do período"
          />
          <View style={styles.metricsGrid}>
            {data.metrics
              .filter((metric) => !isPatrimonyMetric(metric.id))
              .map((metric) => (
                <AnalysisMetricCard key={metric.id} metric={metric} />
              ))}
          </View>

          <InsightsSection insights={data.insights} />

          {pricesData ? (
            <PricesInsightsSection
              prices={pricesData}
              onAddMovement={() => router.push('/(tabs)/movimentos?action=new-movement')}
            />
          ) : null}

          <RefetchingIndicator visible={isRefetching} />
        </ScreenContainer>
      )}
    </View>
  );
}

function isPatrimonyMetric(id: string): boolean {
  return (
    id === 'debt-ratio' ||
    id === 'investment-share' ||
    id === 'liquidity' ||
    id === 'inventory-share'
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
});
