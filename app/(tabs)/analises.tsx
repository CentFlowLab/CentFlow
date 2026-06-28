import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AnalysisMetricCard,
  AnalysisSkeleton,
  AutoInsightsCarousel,
  CategoryBreakdownList,
  CreditsAnalysisSection,
  HealthScoreBreakdownSheet,
  HealthScoreCard,
  MonthEndForecastCard,
  MonthlyComparisonSection,
  PricesInsightsSection,
  SpendingCategoryCard,
  SpendingHeatmap,
  SpendingTrendBars,
  SubscriptionsAnalysisSection,
  TopMerchantsSection,
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
import { useAnalyticsInsights } from '@/hooks/useAnalyticsInsights';
import { useMerchantGroups } from '@/hooks/queries/useMerchantGroups';
import { usePricesData } from '@/hooks/queries/usePricesData';
import { useTransactions } from '@/hooks/queries/useTransactions';
import {
  ANALYSIS_PERIOD_OPTIONS,
  computeSpendingByCategory,
  computeSpendingBuckets,
  getPeriodOption,
  type AnalysisPeriodKey,
} from '@/lib/domain/analysis-period';
import { computeMerchantGroupAnalytics } from '@/lib/merchants/group-analytics';
import { router } from 'expo-router';
import { spacing, colors } from '@/lib/theme';

const PERIOD_SEGMENTS = ANALYSIS_PERIOD_OPTIONS.map((option) => ({
  key: option.key,
  label: option.label,
}));

export default function AnalisesScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useAnalysisData();
  const { data: pricesData } = usePricesData();
  const { data: transactions = [] } = useTransactions('all');
  const { data: merchantGroups = [] } = useMerchantGroups();
  const analytics = useAnalyticsInsights();

  const [period, setPeriod] = useState<AnalysisPeriodKey>('month');
  const [healthSheetVisible, setHealthSheetVisible] = useState(false);
  const periodOption = getPeriodOption(period);

  const topMerchants = useMemo(
    () => computeMerchantGroupAnalytics(merchantGroups, transactions),
    [merchantGroups, transactions],
  );

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
          <SectionHeader title="Análises" subtitle={`Últimos · ${periodOption.label}`} />

          <AutoInsightsCarousel insights={analytics.insights} />

          <HealthScoreCard
            score={analytics.healthScore}
            onPress={() => setHealthSheetVisible(true)}
          />

          <MonthlyComparisonSection
            rows={analytics.monthlyComparison.rows}
            bars={analytics.monthlyComparison.bars}
            currentMonthLabel={analytics.monthlyComparison.currentMonthLabel}
            previousMonthLabel={analytics.monthlyComparison.previousMonthLabel}
          />

          <MonthEndForecastCard forecast={analytics.forecast} />

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

          <CategoryBreakdownList items={analytics.categoryBreakdown} />

          <SpendingHeatmap transactions={transactions} />

          <SubscriptionsAnalysisSection analysis={analytics.subscriptionAnalysis} />

          <CreditsAnalysisSection
            credits={analytics.credits}
            monthlyIncome={analytics.monthlyIncome}
          />

          <TopMerchantsSection merchants={topMerchants} />

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

          {pricesData ? (
            <PricesInsightsSection
              prices={pricesData}
              onAddMovement={() => router.push('/(tabs)/movimentos?action=new-movement')}
            />
          ) : null}

          <RefetchingIndicator visible={isRefetching} />

          <HealthScoreBreakdownSheet
            visible={healthSheetVisible}
            score={analytics.healthScore}
            onClose={() => setHealthSheetVisible(false)}
          />
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
