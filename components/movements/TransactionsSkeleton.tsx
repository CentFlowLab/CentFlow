import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { spacing } from '@/lib/theme';

export function TransactionsSkeleton() {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} variant="elevated" style={styles.row}>
          <Skeleton width={40} height={40} borderRadius={12} />
          <SkeletonGroup gap={spacing.sm} style={styles.textGroup}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="45%" height={10} />
          </SkeletonGroup>
          <Skeleton width={64} height={14} />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  textGroup: {
    flex: 1,
  },
});
