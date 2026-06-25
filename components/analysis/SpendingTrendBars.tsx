import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { SpendingBucket } from '@/lib/domain/analysis-period';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCompactCurrency } from '@/lib/utils/format';

type SpendingTrendBarsProps = {
  buckets: SpendingBucket[];
  periodLabel: string;
};

export function SpendingTrendBars({ buckets, periodLabel }: SpendingTrendBarsProps) {
  const max = buckets.reduce((acc, bucket) => Math.max(acc, bucket.amount), 0);
  const hasData = max > 0;

  return (
    <Card variant="elevated" style={styles.card}>
      <Text variant="h3" style={styles.title}>
        Evolução de gastos
      </Text>
      <Text variant="caption" color="textMuted" style={styles.subtitle}>
        {periodLabel}
      </Text>

      {hasData ? (
        <View style={styles.chart}>
          {buckets.map((bucket) => {
            const heightPct = max > 0 ? Math.max(4, (bucket.amount / max) * 100) : 4;
            return (
              <View key={bucket.key} style={styles.column}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${heightPct}%` }]} />
                </View>
                <Text variant="caption" color="textMuted" numberOfLines={1} style={styles.barLabel}>
                  {bucket.label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text variant="body" color="textSecondary" align="center" style={styles.empty}>
          Sem despesas registadas neste período.
        </Text>
      )}

      {hasData ? (
        <Text variant="caption" color="textMuted" align="center" style={styles.peak}>
          Pico: {formatCompactCurrency(max)}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing['2xl'],
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.xs,
    height: 140,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  barTrack: {
    width: '70%',
    height: 110,
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  barLabel: {
    maxWidth: '100%',
  },
  empty: {
    paddingVertical: spacing.xl,
  },
  peak: {
    marginTop: spacing.md,
  },
});
