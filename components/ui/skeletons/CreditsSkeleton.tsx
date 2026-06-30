import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { radius, spacing } from '@/lib/theme';

export function CreditsSkeleton() {
  return (
    <View style={styles.container}>
      <Skeleton width="100%" height={40} borderRadius={radius.md} />

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
          <Skeleton width={72} height={24} borderRadius={radius.full} />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
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
