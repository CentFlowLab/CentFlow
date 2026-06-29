import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, SectionHeader, Text } from '@/components/ui';
import type { MonthlyComparisonRow, MonthlyBar } from '@/lib/insights/monthly-comparison';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

import { AnalysisSectionEmpty } from './AnalysisSectionEmpty';

type MonthlyComparisonSectionProps = {
  rows: MonthlyComparisonRow[];
  bars: MonthlyBar[];
  currentMonthLabel: string;
  previousMonthLabel: string;
};

function formatChange(change: number | null): string {
  if (change == null) return '—';
  if (change === 0) return '→0%';
  const arrow = change > 0 ? '↑' : '↓';
  return `${arrow}${Math.abs(change)}%`;
}

function hasComparisonData(rows: MonthlyComparisonRow[], bars: MonthlyBar[]): boolean {
  const rowTotal = rows.reduce((sum, row) => sum + row.previous + row.current, 0);
  const barTotal = bars.reduce((sum, bar) => sum + bar.amount, 0);
  return rowTotal > 0 || barTotal > 0;
}

export function MonthlyComparisonSection({
  rows,
  bars,
  currentMonthLabel,
  previousMonthLabel,
}: MonthlyComparisonSectionProps) {
  if (!hasComparisonData(rows, bars)) {
    return (
      <View style={styles.wrap}>
        <SectionHeader title="Comparação mensal" subtitle="Mês calendário" />
        <AnalysisSectionEmpty
          icon={
            <SymbolView
              name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
              tintColor={colors.textMuted}
              size={28}
            />
          }
          title="Sem dados para comparar"
          description="Regista movimentos para ver este mês face ao anterior e a evolução dos últimos 6 meses."
        />
      </View>
    );
  }

  const maxBar = Math.max(...bars.map((b) => b.amount), 1);

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Comparação mensal" subtitle="Mês calendário" />
      <Card variant="outlined" style={styles.card}>
        <View style={styles.headerRow}>
          <Text variant="caption" color="textMuted" style={styles.colLabel} />
          <Text variant="caption" color="textMuted" style={styles.col}>
            {previousMonthLabel}
          </Text>
          <Text variant="caption" color="textMuted" style={styles.col}>
            {currentMonthLabel}
          </Text>
          <Text variant="caption" color="textMuted" style={styles.colChange}>
            Var.
          </Text>
        </View>
        {rows.map((row) => (
          <View key={row.key} style={styles.dataRow}>
            <Text variant="bodyMedium" style={styles.colLabel}>
              {row.label}
            </Text>
            <Text variant="caption" style={styles.col}>
              {formatCurrency(row.previous)}
            </Text>
            <Text variant="caption" style={styles.col}>
              {formatCurrency(row.current)}
            </Text>
            <Text
              variant="caption"
              style={[
                styles.colChange,
                {
                  color:
                    row.changePercent == null
                      ? colors.textMuted
                      : row.key === 'expenses' || row.key === 'savings'
                        ? row.changePercent > 0
                          ? colors.danger
                          : colors.success
                        : row.changePercent >= 0
                          ? colors.success
                          : colors.danger,
                },
              ]}>
              {formatChange(row.changePercent)}
            </Text>
          </View>
        ))}

        <View style={styles.barsBlock}>
          <Text variant="label" color="textMuted" style={styles.barsTitle}>
            Despesas — últimos 6 meses
          </Text>
          {bars.map((bar) => (
            <View key={bar.monthKey} style={styles.barRow}>
              <Text variant="caption" color="textMuted" style={styles.barLabel}>
                {bar.label}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${(bar.amount / maxBar) * 100}%`,
                      backgroundColor: bar.isAboveAverage ? colors.danger : colors.success,
                    },
                  ]}
                />
              </View>
              <Text variant="caption" style={styles.barAmount}>
                {formatCurrency(bar.amount)}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  card: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  colLabel: {
    flex: 1.2,
  },
  col: {
    flex: 1,
    textAlign: 'right',
  },
  colChange: {
    width: 52,
    textAlign: 'right',
    fontWeight: '600',
  },
  barsBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  barsTitle: {
    marginBottom: spacing.xs,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barLabel: {
    width: 36,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barAmount: {
    width: 64,
    textAlign: 'right',
  },
});
