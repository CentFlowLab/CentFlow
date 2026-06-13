import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { spacing } from '@/lib/theme';

export function PricesSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.metricsRow}>
        {[1, 2].map((item) => (
          <Card key={item} variant="elevated" style={styles.metricTile}>
            <Skeleton width={20} height={20} />
            <Skeleton width="70%" height={10} />
            <Skeleton width="50%" height={22} />
          </Card>
        ))}
      </View>

      <Card variant="elevated" style={styles.trackedCard}>
        <Skeleton width="45%" height={12} />
        <Skeleton width="30%" height={32} style={styles.mtSm} />
        <Skeleton width="80%" height={12} />
      </Card>

      <Skeleton width="40%" height={14} style={styles.sectionTitle} />

      {[1, 2, 3, 4].map((item) => (
        <Card key={item} variant="outlined" style={styles.changeCard}>
          <View style={styles.changeHeader}>
            <SkeletonGroup gap={spacing.xs} style={styles.changeInfo}>
              <Skeleton width="75%" height={14} />
              <Skeleton width="55%" height={10} />
            </SkeletonGroup>
            <Skeleton width={48} height={14} />
          </View>
          <Skeleton width="60%" height={10} style={styles.mtSm} />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricTile: {
    flex: 1,
    gap: spacing.xs,
  },
  trackedCard: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  changeCard: {
    gap: spacing.xs,
  },
  changeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  changeInfo: {
    flex: 1,
  },
  mtSm: {
    marginTop: spacing.sm,
  },
});
