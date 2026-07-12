import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { MonthComparison } from '@/lib/domain/transaction-grouping';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

type MovementMonthSummaryCardProps = {
  comparison: MonthComparison;
};

export function MovementMonthSummaryCard({ comparison }: MovementMonthSummaryCardProps) {
  const { current, netChangePercent } = comparison;
  const trendUp = netChangePercent !== null && netChangePercent > 0;
  const trendDown = netChangePercent !== null && netChangePercent < 0;
  const trendColor = trendUp ? colors.success : trendDown ? colors.danger : colors.textMuted;

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.topRow}>
        <Text variant="label" color="textMuted">
          Este mês
        </Text>
        {netChangePercent !== null ? (
          <View style={styles.trend}>
            <SymbolView
              name={{
                ios: trendUp ? 'arrow.up.right' : trendDown ? 'arrow.down.right' : 'minus',
                android: trendUp ? 'trending_up' : trendDown ? 'trending_down' : 'remove',
                web: trendUp ? 'trending_up' : trendDown ? 'trending_down' : 'remove',
              }}
              tintColor={trendColor}
              size={14}
            />
            <Text variant="caption" style={{ color: trendColor }}>
              {formatPercent(netChangePercent, 0)} vs mês anterior
            </Text>
          </View>
        ) : (
          <Text variant="caption" color="textMuted">
            Sem histórico no mês anterior
          </Text>
        )}
      </View>

      <View style={styles.mainRow}>
        <Text variant="h2" color={current.net >= 0 ? 'success' : 'text'}>
          {current.net > 0 ? '+' : ''}
          {formatCurrency(current.net)}
        </Text>
        <Text variant="caption" color="textMuted">
          {current.count} movimento{current.count === 1 ? '' : 's'}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
