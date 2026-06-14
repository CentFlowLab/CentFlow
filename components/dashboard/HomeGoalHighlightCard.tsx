import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { GoalProgressBar } from '@/components/assets/GoalProgressBar';
import { Card, Text } from '@/components/ui';
import type { HomeFeaturedGoal } from '@/lib/domain/home.types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type HomeGoalHighlightCardProps = {
  goal: HomeFeaturedGoal;
};

export function HomeGoalHighlightCard({ goal }: HomeGoalHighlightCardProps) {
  const remaining = Math.max(0, goal.target - goal.current);

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/ativos')}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <Card variant="outlined" style={styles.card}>
        <View style={styles.header}>
          <Text variant="label" color="textMuted">
            Objetivo em foco
          </Text>
          <Text variant="caption" color="primary">
            {goal.percent}%
          </Text>
        </View>
        <Text variant="bodyMedium">{goal.name}</Text>
        <GoalProgressBar percent={goal.percent} height={8} />
        <View style={styles.footer}>
          <Text variant="caption" color="textSecondary">
            {formatCurrency(goal.current)} de {formatCurrency(goal.target)}
          </Text>
          <Text variant="caption" color="textMuted">
            Faltam {formatCurrency(remaining)}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
    backgroundColor: colors.backgroundElevated,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.92,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
