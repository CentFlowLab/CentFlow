import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AnalysisDebtTab,
  AnalysisPatrimonyTab,
  AnalysisSkeleton,
  AnalysisSpendingTab,
  AnalysisSummaryTab,
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
import { useTransactions } from '@/hooks/queries/useTransactions';
import { applyAnalysisPeriod } from '@/lib/domain/analysis.compose';
import {
  ANALYSIS_PERIOD_OPTIONS,
  getPeriodOption,
  type AnalysisPeriodKey,
} from '@/lib/domain/analysis-period';
import { spacing } from '@/lib/theme';

type AnalysisTabKey = 'summary' | 'spending' | 'debt' | 'patrimony';

const TAB_SEGMENTS: Array<{ key: AnalysisTabKey; label: string }> = [
  { key: 'summary', label: 'Resumo' },
  { key: 'spending', label: 'Gastos' },
  { key: 'debt', label: 'Dívida' },
  { key: 'patrimony', label: 'Património' },
];

const PERIOD_SEGMENTS = ANALYSIS_PERIOD_OPTIONS.map((option) => ({
  key: option.key,
  label: option.label,
}));

export default function AnalisesScreen() {
  const { data: baseData, isLoading, isError, error, refetch, isRefetching } = useAnalysisData();
  const { data: transactions = [] } = useTransactions('all');
  const { data: assetsData } = useAssets();

  const [activeTab, setActiveTab] = useState<AnalysisTabKey>('summary');
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

          <View style={styles.tabSelector}>
            <SegmentedControl segments={TAB_SEGMENTS} value={activeTab} onChange={setActiveTab} />
          </View>

          {activeTab === 'spending' ? (
            <View style={styles.periodSelector}>
              <SegmentedControl
                segments={PERIOD_SEGMENTS}
                value={period}
                onChange={setPeriod}
              />
            </View>
          ) : null}

          {activeTab === 'summary' ? <AnalysisSummaryTab data={data} /> : null}
          {activeTab === 'spending' ? (
            <AnalysisSpendingTab transactions={transactions} period={period} />
          ) : null}
          {activeTab === 'debt' ? <AnalysisDebtTab /> : null}
          {activeTab === 'patrimony' ? <AnalysisPatrimonyTab data={data} /> : null}

          <RefetchingIndicator visible={isRefetching} />
        </ScreenContainer>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
  tabSelector: {
    marginBottom: spacing.md,
  },
  periodSelector: {
    marginBottom: spacing.md,
  },
});
