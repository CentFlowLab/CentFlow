import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { radius, spacing } from '@/lib/theme';

export function DashboardSkeleton() {
  return (
    <View style={styles.container}>
      <Card variant="elevated" style={styles.heroCard}>
        <Skeleton width="35%" height={12} />
        <Skeleton width="65%" height={40} style={styles.mtSm} />
        <Skeleton width="45%" height={14} style={styles.mtSm} />
        <View style={styles.breakdownRow}>
          <Skeleton width="45%" height={36} />
          <Skeleton width="45%" height={36} />
        </View>
      </Card>

      <View style={styles.alertsBlock}>
        <Skeleton width="50%" height={14} />
        <Card variant="elevated" style={styles.alertCard}>
          <SkeletonGroup gap={spacing.xs}>
            <Skeleton width="80%" height={14} />
            <Skeleton width="60%" height={12} />
          </SkeletonGroup>
        </Card>
        <Card variant="elevated" style={styles.alertCard}>
          <SkeletonGroup gap={spacing.xs}>
            <Skeleton width="75%" height={14} />
            <Skeleton width="55%" height={12} />
          </SkeletonGroup>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  heroCard: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  alertsBlock: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  alertCard: {
    gap: spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  mtSm: { marginTop: spacing.sm },
});
