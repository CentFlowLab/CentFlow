import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AnalysisMetricCard,
  AnalysisSkeleton,
  InsightsSection,
  PricesInsightsSection,
  SpendingCategoryCard,
  SpendingTrendBars,
  TrendsSummaryCard,
} from '@/components/analysis';
import { AppHeader, SegmentedControl } from '@/components/layout';
import {
  ErrorState,
  RefetchingIndicator,
  ScreenContainer,
  SectionHeader,
} from '@/components/ui';
import { useAnalysisData } from '@/hooks/queries/useAnalysisData';
import { useAssets } from '@/hooks/queries/useAssets';
import { usePricesData } from '@/hooks/queries/usePricesData';
import { useTransactions } from '@/hooks/queries/useTransactions';
import {
  applyAnalysisPeriod,
} from '@/lib/domain/analysis.compose';
import {
  ANALYSIS_PERIOD_OPTIONS,
  computeSpendingByCategory,
  computeSpendingBuckets,
  getPeriodOption,
  type AnalysisPeriodKey,
} from '@/lib/domain/analysis-period';
import { router } from 'expo-router';
import { spacing, colors } from '@/lib/theme';

const PERIOD_SEGMENTS = ANALYSIS_PERIOD_OPTIONS.map((option) => ({
  key: option.key,
  label: option.label,
}));

export default function AnalisesScreen() {
  const { data: baseData, isLoading, isError, error, refetch, isRefetching } = useAnalysisData();
  const { data: pricesData } = usePricesData();
  const { data: transactions = [] } = useTransactions('all');
  const { data: assetsData } = useAssets();

  const [period, setPeriod] = useState<AnalysisPeriodKey>('month');
  const periodOption = getPeriodOption(period);

  const data = useMemo(() => {
    if (!baseData) return null;
    return applyAnalysisPeriod(
      baseData,
      transactions,
      periodOption.days,
      periodOption.label,
      assetsData ?? undefined,
    );
  }, [baseData, transactions, periodOption.days, periodOption.label, assetsData]);

  const periodCategories = useMemo(
    () => computeSpendingByCategory(transactions, periodOption.days),
    [transactions, periodOption.days],
  );
  const spendingBuckets = useMemo(
    () => computeSpendingBuckets(transactions, periodOption),
    [transactions, periodOption],
  );

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
          <SectionHeader title="Análises" subtitle={`Período · ${periodOption.label}`} />

          <View style={styles.periodSelector}>
            <SegmentedControl
              segments={PERIOD_SEGMENTS}
              value={period}
              onChange={setPeriod}
            />
          </View>

          <TrendsSummaryCard
            trends={data.trends}
            periodLabel={data.periodLabel}
            showNetWorthChange={false}
          />

          <SpendingTrendBars buckets={spendingBuckets} periodLabel={periodOption.label} />

          <SpendingCategoryCard
            categories={periodCategories}
            periodLabel={periodOption.label}
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
  periodSelector: {
    marginBottom: spacing.lg,
  },
});
