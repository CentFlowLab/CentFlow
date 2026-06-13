import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { radius, spacing } from '@/lib/theme';

export function DashboardSkeleton() {
  return (
    <View style={styles.container}>
      <Card variant="elevated" style={styles.heroCard}>
        <Skeleton width="40%" height={12} />
        <Skeleton width="70%" height={36} style={styles.mtMd} />
        <Skeleton width="30%" height={14} style={styles.mtSm} />
        <View style={styles.breakdownRow}>
          <Skeleton width="45%" height={40} />
          <Skeleton width="45%" height={40} />
        </View>
        <Skeleton width={120} height={40} style={styles.mtMd} />
      </Card>

      <View style={styles.metricsGrid}>
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="elevated" style={styles.metricCard}>
            <Skeleton width={36} height={36} />
            <Skeleton width="60%" height={10} style={styles.mtSm} />
            <Skeleton width="80%" height={18} style={styles.mtSm} />
          </Card>
        ))}
      </View>

      <Skeleton width="55%" height={16} style={styles.mtLg} />
      {[1, 2].map((i) => (
        <Card key={i} variant="outlined" style={styles.alertCard}>
          <Skeleton width={40} height={40} />
          <SkeletonGroup gap={spacing.sm} style={styles.alertContent}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="90%" height={12} />
          </SkeletonGroup>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  heroCard: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    minWidth: '30%',
    gap: spacing.xs,
  },
  alertCard: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  mtSm: { marginTop: spacing.sm },
  mtMd: { marginTop: spacing.md },
  mtLg: { marginTop: spacing.lg },
});
