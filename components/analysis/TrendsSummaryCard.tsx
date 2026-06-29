import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { AnalysisTrends } from '@/lib/domain/analysis.types';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

import { AnalysisSectionEmpty } from './AnalysisSectionEmpty';

type TrendsSummaryCardProps = {
  trends: AnalysisTrends;
  periodLabel: string;
  showNetWorthChange?: boolean;
};

export function TrendsSummaryCard({
  trends,
  periodLabel,
  showNetWorthChange = true,
}: TrendsSummaryCardProps) {
  const hasActivity = trends.totalIncome + trends.totalExpenses > 0;

  if (!hasActivity) {
    return (
      <View style={styles.wrap}>
        <Text variant="h3" style={styles.title}>
          Tendências
        </Text>
        <Text variant="caption" color="textMuted" style={styles.subtitle}>
          {periodLabel}
        </Text>
        <AnalysisSectionEmpty
          icon={
            <SymbolView
              name={{ ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' }}
              tintColor={colors.textMuted}
              size={28}
            />
          }
          title="Sem movimentos no período"
          description="Regista receitas ou despesas para ver tendências e fluxo de caixa."
        />
      </View>
    );
  }

  const maxValue = Math.max(trends.totalIncome, trends.totalExpenses, 1);
  const incomeWidth = `${Math.round((trends.totalIncome / maxValue) * 100)}%`;
  const expenseWidth = `${Math.round((trends.totalExpenses / maxValue) * 100)}%`;

  return (
    <Card variant="elevated" style={styles.card}>
      <Text variant="h3" style={styles.title}>
        Tendências
      </Text>
      <Text variant="caption" color="textMuted" style={styles.subtitle}>
        {periodLabel}
      </Text>

      <View style={styles.summaryGrid}>
        <TrendStat
          label="Receitas"
          value={formatCurrency(trends.totalIncome)}
          tone={colors.success}
        />
        <TrendStat
          label="Gastos"
          value={formatCurrency(trends.totalExpenses)}
          tone={colors.danger}
        />
        <TrendStat
          label="Fluxo líquido"
          value={formatCurrency(trends.netCashflow)}
          tone={trends.netCashflow >= 0 ? colors.primary : colors.warning}
        />
      </View>

      <View style={styles.bars}>
        <BarRow label="Receitas" width={incomeWidth} color={colors.success} />
        <BarRow label="Gastos" width={expenseWidth} color={colors.danger} />
      </View>

      {showNetWorthChange ? (
        <View style={styles.netWorthRow}>
          <Text variant="caption" color="textMuted">
            Evolução do património
          </Text>
          <Text
            variant="bodyMedium"
            style={{
              color: trends.netWorthChangePercent >= 0 ? colors.success : colors.danger,
            }}>
            {formatPercent(trends.netWorthChangePercent, 1, true)}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function TrendStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <View style={styles.stat}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ color: tone }}>
        {value}
      </Text>
    </View>
  );
}

function BarRow({
  label,
  width,
  color,
}: {
  label: string;
  width: string;
  color: string;
}) {
  return (
    <View style={styles.barRow}>
      <Text variant="caption" color="textSecondary" style={styles.barLabel}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: width as `${number}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing['2xl'],
    gap: spacing.xs,
  },
  card: {
    marginBottom: spacing['2xl'],
    gap: spacing.md,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bars: {
    gap: spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barLabel: {
    width: 72,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  netWorthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
