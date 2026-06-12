import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

function SkeletonBlock({
  width,
  height,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  style?: object;
}) {
  return (
    <View
      style={[
        styles.block,
        { width, height },
        style,
      ]}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <View style={styles.container}>
      {/* Hero card skeleton */}
      <Card variant="elevated" style={styles.heroCard}>
        <SkeletonBlock width="40%" height={12} />
        <SkeletonBlock width="70%" height={36} style={styles.mtMd} />
        <SkeletonBlock width="30%" height={14} style={styles.mtSm} />
        <View style={styles.breakdownRow}>
          <SkeletonBlock width="45%" height={40} />
          <SkeletonBlock width="45%" height={40} />
        </View>
        <SkeletonBlock width={120} height={40} style={styles.mtMd} />
      </Card>

      {/* Metrics grid skeleton */}
      <View style={styles.metricsGrid}>
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="elevated" style={styles.metricCard}>
            <SkeletonBlock width={36} height={36} />
            <SkeletonBlock width="60%" height={10} style={styles.mtSm} />
            <SkeletonBlock width="80%" height={18} style={styles.mtSm} />
          </Card>
        ))}
      </View>

      {/* Attention skeleton */}
      <SkeletonBlock width="55%" height={16} style={styles.mtLg} />
      {[1, 2].map((i) => (
        <Card key={i} variant="outlined" style={styles.alertCard}>
          <SkeletonBlock width={40} height={40} />
          <View style={styles.alertContent}>
            <SkeletonBlock width="70%" height={14} />
            <SkeletonBlock width="90%" height={12} style={styles.mtSm} />
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  block: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radius.sm,
    opacity: 0.6,
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
