import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { spacing } from '@/lib/theme';

export function AssetsSkeleton() {
  return (
    <View style={styles.container}>
      <Card variant="elevated" style={styles.overviewCard}>
        <Skeleton width="40%" height={12} />
        <View style={styles.overviewRow}>
          {[1, 2, 3].map((item) => (
            <SkeletonGroup key={item} gap={spacing.xs} style={styles.overviewItem}>
              <Skeleton width="100%" height={22} />
              <Skeleton width="70%" height={10} />
            </SkeletonGroup>
          ))}
        </View>
      </Card>

      <Skeleton width="100%" height={40} borderRadius={12} style={styles.segment} />

      <Skeleton width="50%" height={14} />
      <Card variant="elevated" style={styles.summaryCard}>
        <Skeleton width="35%" height={10} />
        <Skeleton width="45%" height={24} style={styles.mtSm} />
        <Skeleton width="100%" height={8} style={styles.mtMd} />
      </Card>

      {[1, 2, 3].map((item) => (
        <Card key={item} variant="elevated" style={styles.listItem}>
          <Skeleton width={36} height={36} />
          <SkeletonGroup gap={spacing.xs} style={styles.listText}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="50%" height={10} />
          </SkeletonGroup>
          <Skeleton width={72} height={24} borderRadius={999} />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  overviewCard: {
    gap: spacing.md,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  overviewItem: {
    flex: 1,
  },
  segment: {
    marginVertical: spacing.sm,
  },
  summaryCard: {
    gap: spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  listText: {
    flex: 1,
  },
  mtSm: {
    marginTop: spacing.sm,
  },
  mtMd: {
    marginTop: spacing.md,
  },
});
