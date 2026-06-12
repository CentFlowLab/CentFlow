import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

function Block({ width, height, style }: { width: number | `${number}%`; height: number; style?: object }) {
  return <View style={[styles.block, { width, height }, style]} />;
}

export function AnalysisSkeleton() {
  return (
    <View style={styles.container}>
      <Card variant="elevated" style={styles.card}>
        <Block width="50%" height={16} />
        <Block width="70%" height={12} style={styles.mtSm} />
        <View style={styles.chartRow}>
          <Block width={160} height={160} style={styles.circle} />
          <View style={styles.legend}>
            <Block width="100%" height={36} />
            <Block width="100%" height={36} />
            <Block width="100%" height={36} />
          </View>
        </View>
      </Card>

      <View style={styles.metricsGrid}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="elevated" style={styles.metricCard}>
            <Block width={36} height={36} />
            <Block width="60%" height={10} style={styles.mtSm} />
            <Block width="40%" height={18} style={styles.mtSm} />
          </Card>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  block: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radius.sm,
    opacity: 0.6,
  },
  card: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chartRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  circle: {
    borderRadius: 80,
  },
  legend: {
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    gap: spacing.xs,
  },
  mtSm: {
    marginTop: spacing.sm,
  },
});
