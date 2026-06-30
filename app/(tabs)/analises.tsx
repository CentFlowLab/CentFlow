import { useMemo, useState, useEffect } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';

import {
  AnalysisErrorBoundary,
  AnalysisMetricCard,
  AnalysisSkeleton,
  AnalysisTabChips,
  AutoInsightsCarousel,
  CreditsAnalysisSection,
  HealthScoreBreakdownSheet,
  HealthScoreCard,
  MonthEndForecastCard,
  MonthlyComparisonSection,
  PatrimonyAllocationCard,
  SpendingCategoryCard,
  SpendingHeatmap,
  SubscriptionsAnalysisSection,
  TrendsSummaryCard,
  type AnalysisTabKey,
} from '@/components/analysis';
import { AppHeader, SegmentedControl } from '@/components/layout';
import {
  ErrorState,
  RefetchingIndicator,
  ScreenContainer,
  SectionHeader,
  Text,
} from '@/components/ui';
import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { ACCOUNTS_FEATURE_ENABLED } from '@/lib/config/product-features';
import { useAnalysisData } from '@/hooks/queries/useAnalysisData';
import { useAssets } from '@/hooks/queries/useAssets';
import { usePatrimonyAllocation } from '@/hooks/queries/usePatrimonyAllocation';
import { useAnalyticsInsights } from '@/hooks/useAnalyticsInsights';
import { useTransactions } from '@/hooks/queries/useTransactions';
import {
  ANALYSIS_PERIOD_OPTIONS,
  computeSpendingByCategory,
  getPeriodOption,
  type AnalysisPeriodKey,
} from '@/lib/domain/analysis-period';
import { spacing, colors } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

const PERIOD_SEGMENTS = ANALYSIS_PERIOD_OPTIONS.map((option) => ({
  key: option.key,
  label: option.label,
}));

export default function AnalisesScreen() {
  const params = useLocalSearchParams<{ tab?: string; period?: string }>();
  const { data, isLoading, isError, error, refetch, isRefetching } = useAnalysisData();
  const { data: patrimonyData } = usePatrimonyAllocation();
  const { data: assets } = useAssets();

  const [tab, setTab] = useState<AnalysisTabKey>('resumo');
  const [period, setPeriod] = useState<AnalysisPeriodKey>('month');
  const [healthSheetVisible, setHealthSheetVisible] = useState(false);
  const periodOption = getPeriodOption(period);
  const needsTransactions = tab === 'gastos' || tab === 'patrimonio';
  const needsAnalytics = tab !== 'patrimonio';

  const { data: transactions = [] } = useTransactions('all', { enabled: needsTransactions });
  const analytics = useAnalyticsInsights(new Date(), { enabled: needsAnalytics });
  const { totalBalance: accountsTotal } = useAccountsWithBalances(
    needsTransactions ? transactions : [],
  );

  useEffect(() => {
    if (params.tab === 'gastos' || params.tab === 'divida' || params.tab === 'patrimonio' || params.tab === 'resumo') {
      setTab(params.tab);
    }
    const validPeriods: AnalysisPeriodKey[] = ['week', 'month', 'quarter', 'halfyear', 'year'];
    if (params.period && validPeriods.includes(params.period as AnalysisPeriodKey)) {
      setPeriod(params.period as AnalysisPeriodKey);
    }
  }, [params.tab, params.period]);

  const periodCategories = useMemo(
    () =>
      tab === 'gastos'
        ? computeSpendingByCategory(transactions, periodOption.days)
        : [],
    [tab, transactions, periodOption.days],
  );

  const allocation = patrimonyData?.allocation ?? data?.allocation ?? [];
  const allocationTotal = useMemo(
    () => allocation.reduce((sum, item) => sum + Math.max(0, item.value), 0),
    [allocation],
  );

  const goalsSaved = useMemo(
    () => (assets?.goals ?? []).reduce((sum, g) => sum + g.current, 0),
    [assets?.goals],
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
          <SectionHeader title="Análises" />

          <AnalysisTabChips value={tab} onChange={setTab} />

          {tab === 'resumo' ? (
            <Animated.View entering={FadeIn.duration(200)} key="resumo">
              <AnalysisErrorBoundary label="Insights automáticos">
                <AutoInsightsCarousel insights={analytics.insights} />
              </AnalysisErrorBoundary>

              <AnalysisErrorBoundary label="Saúde financeira">
                <HealthScoreCard
                  score={analytics.healthScore}
                  onPress={() => setHealthSheetVisible(true)}
                />
              </AnalysisErrorBoundary>

              <AnalysisErrorBoundary label="Previsão de fim de mês">
                <MonthEndForecastCard forecast={analytics.forecast} />
              </AnalysisErrorBoundary>

              <AnalysisErrorBoundary label="Comparação mensal">
                <MonthlyComparisonSection
                  rows={analytics.monthlyComparison.rows}
                  bars={analytics.monthlyComparison.bars}
                  currentMonthLabel={analytics.monthlyComparison.currentMonthLabel}
                  previousMonthLabel={analytics.monthlyComparison.previousMonthLabel}
                />
              </AnalysisErrorBoundary>
            </Animated.View>
          ) : null}

          {tab === 'gastos' ? (
            <Animated.View entering={FadeIn.duration(200)} key="gastos">
              <View style={styles.periodSelector}>
                <SegmentedControl
                  segments={PERIOD_SEGMENTS}
                  value={period}
                  onChange={setPeriod}
                />
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

              <AnalysisErrorBoundary label="Fixos">
                <SubscriptionsAnalysisSection analysis={analytics.subscriptionAnalysis} />
              </AnalysisErrorBoundary>
            </Animated.View>
          ) : null}

          {tab === 'divida' ? (
            <Animated.View entering={FadeIn.duration(200)} key="divida">
              <AnalysisErrorBoundary label="Créditos">
                <CreditsAnalysisSection
                  credits={analytics.credits}
                  monthlyIncome={analytics.monthlyIncome}
                />
              </AnalysisErrorBoundary>

              <SectionHeader title="Métricas de dívida" />
              <View style={styles.metricsGrid}>
                {data.metrics
                  .filter((metric) => isDebtMetric(metric.id))
                  .map((metric) => (
                    <AnalysisMetricCard key={metric.id} metric={metric} />
                  ))}
              </View>
            </Animated.View>
          ) : null}

          {tab === 'patrimonio' ? (
            <Animated.View entering={FadeIn.duration(200)} key="patrimonio">
              <AnalysisErrorBoundary label="Alocação de património">
                <PatrimonyAllocationCard allocation={allocation} totalAssets={allocationTotal} />
              </AnalysisErrorBoundary>

              {ACCOUNTS_FEATURE_ENABLED && accountsTotal > 0 ? (
                <View style={styles.accountsSummary}>
                  <Text variant="bodyMedium" color="textSecondary">
                    Total em contas
                  </Text>
                  <Text variant="h3">{formatCurrency(accountsTotal)}</Text>
                </View>
              ) : null}

              {goalsSaved > 0 ? (
                <View style={styles.accountsSummary}>
                  <Text variant="bodyMedium" color="textSecondary">
                    Em objetivos
                  </Text>
                  <Text variant="h3">{formatCurrency(goalsSaved)}</Text>
                  <Pressable onPress={() => router.push('/(tabs)/ativos?tab=objetivos')}>
                    <Text variant="caption" color="primary" style={styles.accountsLink}>
                      Ver objetivos →
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <SectionHeader title="Métricas de património" />
              <View style={styles.metricsGrid}>
                {data.metrics
                  .filter((metric) => isPatrimonyMetric(metric.id))
                  .map((metric) => (
                    <AnalysisMetricCard key={metric.id} metric={metric} />
                  ))}
              </View>
            </Animated.View>
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

function isDebtMetric(id: string): boolean {
  return id === 'debt-ratio' || id === 'liquidity' || id === 'cashflow';
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
  accountsSummary: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountsLink: {
    marginTop: spacing.xs,
    fontWeight: '600',
  },
});
