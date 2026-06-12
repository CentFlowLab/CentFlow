import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

function Block({ width, height }: { width: number | `${number}%`; height: number }) {
  return <View style={[styles.block, { width, height }]} />;
}

export function TransactionsSkeleton() {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} variant="elevated" style={styles.row}>
          <Block width={40} height={40} />
          <View style={styles.textGroup}>
            <Block width="70%" height={14} />
            <Block width="45%" height={10} />
          </View>
          <Block width={64} height={14} />
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
  block: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radius.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  textGroup: {
    flex: 1,
    gap: spacing.sm,
  },
});
