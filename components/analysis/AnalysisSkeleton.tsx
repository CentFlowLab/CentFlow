import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { spacing } from '@/lib/theme';

export function AnalysisSkeleton() {
  return (
    <View style={styles.container}>
      <Card variant="elevated" style={styles.card}>
        <Skeleton width="50%" height={16} />
        <Skeleton width="70%" height={12} style={styles.mtSm} />
        <View style={styles.chartRow}>
          <Skeleton width={160} height={160} circle />
          <SkeletonGroup gap={spacing.md} style={styles.legend}>
            <Skeleton width="100%" height={36} />
            <Skeleton width="100%" height={36} />
            <Skeleton width="100%" height={36} />
          </SkeletonGroup>
        </View>
      </Card>

      <View style={styles.metricsGrid}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="elevated" style={styles.metricCard}>
            <Skeleton width={36} height={36} />
            <Skeleton width="60%" height={10} style={styles.mtSm} />
            <Skeleton width="40%" height={18} style={styles.mtSm} />
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
  card: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chartRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  legend: {
    flex: 1,
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
