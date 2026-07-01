import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnalysisExpandableSection } from '@/components/analysis/AnalysisExpandableSection';
import { SpendingCalendarCard } from '@/components/analysis/SpendingCalendarCard';
import { SpendingCategoryCard } from '@/components/analysis/SpendingCategoryCard';
import { SpendingTrendBars } from '@/components/analysis/SpendingTrendBars';
import {
  computeSpendingBuckets,
  computeSpendingByCategory,
  getPeriodOption,
  type AnalysisPeriodKey,
} from '@/lib/domain/analysis-period';
import type { Transaction } from '@/lib/domain/transaction.types';
import { spacing } from '@/lib/theme';

type AnalysisSpendingTabProps = {
  transactions: Transaction[];
  period: AnalysisPeriodKey;
};

export function AnalysisSpendingTab({ transactions, period }: AnalysisSpendingTabProps) {
  const periodOption = getPeriodOption(period);
  const monthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const periodCategories = useMemo(
    () => computeSpendingByCategory(transactions, periodOption.days),
    [transactions, periodOption.days],
  );
  const spendingBuckets = useMemo(
    () => computeSpendingBuckets(transactions, periodOption),
    [transactions, periodOption],
  );

  return (
    <View style={styles.container}>
      <SpendingCalendarCard transactions={transactions} monthKey={monthKey} />

      <SpendingCategoryCard categories={periodCategories} periodLabel={periodOption.label} />

      <AnalysisExpandableSection title="Tendências" subtitle={periodOption.label}>
        <SpendingTrendBars buckets={spendingBuckets} periodLabel={periodOption.label} />
      </AnalysisExpandableSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
});
