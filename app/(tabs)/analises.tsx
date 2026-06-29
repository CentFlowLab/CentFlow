import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AnalysisErrorBoundary,
  AnalysisMetricCard,
  AnalysisSkeleton,
  AutoInsightsCarousel,
  CreditsAnalysisSection,
  HealthScoreBreakdownSheet,
  HealthScoreCard,
  MonthEndForecastCard,
  MonthlyComparisonSection,
  PatrimonyAllocationCard,
  PricesInsightsSection,
  SpendingCategoryCard,
  SpendingHeatmap,
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
  Text,
} from '@/components/ui';
import { useAnalysisData } from '@/hooks/queries/useAnalysisData';
import { usePatrimonyAllocation } from '@/hooks/queries/usePatrimonyAllocation';
import { useAnalyticsInsights } from '@/hooks/useAnalyticsInsights';
import { useMerchantGroups } from '@/hooks/queries/useMerchantGroups';
import { usePricesData } from '@/hooks/queries/usePricesData';
import { useTransactions } from '@/hooks/queries/useTransactions';
import {
  ANALYSIS_PERIOD_OPTIONS,
  computeSpendingByCategory,
  getPeriodOption,
  type AnalysisPeriodKey,
} from '@/lib/domain/analysis-period';
import { computeMerchantGroupAnalytics } from '@/lib/merchants/group-analytics';
import { router } from 'expo-router';
import { spacing, colors } from '@/lib/theme';
import type { PricesData } from '@/lib/data/prices.mocks';

const PERIOD_SEGMENTS = ANALYSIS_PERIOD_OPTIONS.map((option) => ({
  key: option.key,
  label: option.label,
}));

function hasMeaningfulPriceData(prices: PricesData): boolean {
  return (
    prices.trackedProducts > 0 &&
    (prices.changes.length > 0 || prices.insights.length > 0)
  );
}

export default function AnalisesScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useAnalysisData();
  const { data: patrimonyData } = usePatrimonyAllocation();
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

  const allocation = patrimonyData?.allocation ?? data?.allocation ?? [];
  const totalAssets = patrimonyData?.totalAssets ?? data?.netWorth.totalAssets ?? 0;

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
          <SectionHeader title="Análises" subtitle="Mês calendário" />

          <AnalysisErrorBoundary label="Insights automáticos">
            <AutoInsightsCarousel insights={analytics.insights} />
          </AnalysisErrorBoundary>

          <AnalysisErrorBoundary label="Saúde financeira">
            <HealthScoreCard
              score={analytics.healthScore}
              onPress={() => setHealthSheetVisible(true)}
            />
          </AnalysisErrorBoundary>

          <AnalysisErrorBoundary label="Comparação mensal">
            <MonthlyComparisonSection
              rows={analytics.monthlyComparison.rows}
              bars={analytics.monthlyComparison.bars}
              currentMonthLabel={analytics.monthlyComparison.currentMonthLabel}
              previousMonthLabel={analytics.monthlyComparison.previousMonthLabel}
            />
          </AnalysisErrorBoundary>

          <AnalysisErrorBoundary label="Previsão de fim de mês">
            <MonthEndForecastCard forecast={analytics.forecast} />
          </AnalysisErrorBoundary>

          <AnalysisErrorBoundary label="Alocação de património">
            <PatrimonyAllocationCard allocation={allocation} totalAssets={totalAssets} />
          </AnalysisErrorBoundary>

          <View style={styles.periodSelector}>
            <SegmentedControl
              segments={PERIOD_SEGMENTS}
              value={period}
              onChange={setPeriod}
            />
            <Text variant="caption" color="textMuted" style={styles.periodNote}>
              Afecta categorias e evolução abaixo
            </Text>
          </View>

          <TrendsSummaryCard
            trends={data.trends}
            periodLabel={periodOption.label}
            showNetWorthChange={false}
          />

          <SpendingCategoryCard
            categories={periodCategories}
            periodLabel={periodOption.label}
          />

          <AnalysisErrorBoundary label="Heatmap de gastos">
            <SpendingHeatmap transactions={transactions} />
          </AnalysisErrorBoundary>

          <AnalysisErrorBoundary label="Subscrições">
            <SubscriptionsAnalysisSection analysis={analytics.subscriptionAnalysis} />
          </AnalysisErrorBoundary>

          <AnalysisErrorBoundary label="Créditos">
            <CreditsAnalysisSection
              credits={analytics.credits}
              monthlyIncome={analytics.monthlyIncome}
            />
          </AnalysisErrorBoundary>

          <TopMerchantsSection merchants={topMerchants} />

          <SectionHeader
            title="Métricas"
            subtitle="Mês calendário"
          />
          <View style={styles.metricsGrid}>
            {data.metrics
              .filter((metric) => !isPatrimonyMetric(metric.id))
              .map((metric) => (
                <AnalysisMetricCard key={metric.id} metric={metric} />
              ))}
          </View>

          {pricesData && hasMeaningfulPriceData(pricesData) ? (
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
    gap: spacing.xs,
  },
  periodNote: {
    paddingHorizontal: spacing.xs,
  },
});
