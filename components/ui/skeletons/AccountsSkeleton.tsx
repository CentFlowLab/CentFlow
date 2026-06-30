import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { spacing } from '@/lib/theme';

export function AccountsSkeleton() {
  return (
    <View style={styles.container}>
      <Skeleton width="30%" height={12} />

      {[1, 2, 3].map((item) => (
        <Card key={item} variant="elevated" style={styles.accountCard}>
          <Skeleton width={40} height={40} circle />
          <SkeletonGroup gap={spacing.xs} style={styles.accountText}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="40%" height={10} />
          </SkeletonGroup>
          <Skeleton width={72} height={18} />
        </Card>
      ))}

      <View style={styles.totalRow}>
        <Skeleton width={48} height={14} />
        <Skeleton width={96} height={24} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  accountText: {
    flex: 1,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
  },
});
