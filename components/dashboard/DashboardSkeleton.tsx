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

      <Card variant="elevated" style={styles.assistantCard}>
        <Skeleton width="30%" height={12} />
        {[1, 2].map((i) => (
          <View key={i} style={styles.insightRow}>
            <Skeleton width={28} height={28} borderRadius={radius.md} />
            <SkeletonGroup gap={spacing.xs} style={styles.insightText}>
              <Skeleton width="75%" height={14} />
              <Skeleton width="90%" height={12} />
            </SkeletonGroup>
          </View>
        ))}
      </Card>

      <Card variant="elevated" style={styles.scoreCard}>
        <Skeleton width="40%" height={12} />
        <Skeleton width="25%" height={32} style={styles.mtSm} />
        <Skeleton width="100%" height={6} style={styles.mtMd} />
      </Card>
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
  assistantCard: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  scoreCard: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  insightRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  insightText: {
    flex: 1,
  },
  mtSm: { marginTop: spacing.sm },
  mtMd: { marginTop: spacing.md },
});
