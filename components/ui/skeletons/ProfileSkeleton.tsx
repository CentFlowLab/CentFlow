import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { spacing } from '@/lib/theme';

export function ProfileSkeleton() {
  return (
    <View style={styles.container}>
      <Card variant="elevated" style={styles.scoreCard}>
        <Skeleton width="45%" height={12} />
        <Skeleton width="100%" height={8} style={styles.mtMd} />
        <View style={styles.scoreRow}>
          <Skeleton width={48} height={48} circle />
          <SkeletonGroup gap={spacing.sm} style={styles.scoreText}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="55%" height={12} />
          </SkeletonGroup>
        </View>
      </Card>

      <Card variant="elevated" style={styles.profileCard}>
        <Skeleton width={64} height={64} circle />
        <SkeletonGroup gap={spacing.sm} style={styles.profileText}>
          <Skeleton width="60%" height={18} />
          <Skeleton width="80%" height={12} />
        </SkeletonGroup>
      </Card>

      {[1, 2].map((section) => (
        <View key={section} style={styles.section}>
          <Skeleton width="35%" height={14} style={styles.sectionTitle} />
          <Card variant="outlined" padding="sm">
            {[1, 2, 3].map((item) => (
              <View key={item} style={styles.menuRow}>
                <Skeleton width={22} height={22} />
                <Skeleton width="55%" height={14} />
                <Skeleton width={16} height={16} />
              </View>
            ))}
          </Card>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  scoreCard: {
    gap: spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  scoreText: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  profileText: {
    flex: 1,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  mtMd: {
    marginTop: spacing.md,
  },
});
