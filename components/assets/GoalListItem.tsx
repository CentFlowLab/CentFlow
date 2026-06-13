import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { Goal } from '@/lib/domain/assets.types';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type GoalListItemProps = {
  goal: Goal;
};

export function GoalListItem({ goal }: GoalListItemProps) {
  const progress = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
  const currency = goal.currency ?? 'EUR';

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <SymbolView
            name={{ ios: 'target', android: 'flag', web: 'flag' }}
            tintColor={colors.primary}
            size={18}
          />
        </View>
        <View style={styles.content}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {goal.name}
          </Text>
          <Text variant="caption" color="textMuted">
            {formatCurrency(goal.current, currency)} de {formatCurrency(goal.target, currency)}
          </Text>
        </View>
        <Text variant="bodyMedium" color="primary">
          {Math.round(progress)}%
        </Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  track: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
});
