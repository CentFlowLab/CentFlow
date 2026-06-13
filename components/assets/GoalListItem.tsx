import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { Goal } from '@/lib/domain/assets.types';
import { getGoalProgress } from '@/lib/domain/goal.utils';
import { colors, radius, spacing } from '@/lib/theme';
import {
  daysUntil,
  formatCurrency,
  formatDateShort,
  formatRelativeDays,
} from '@/lib/utils/format';

import { GoalProgressBar } from './GoalProgressBar';

type GoalListItemProps = {
  goal: Goal;
  onPress?: (goal: Goal) => void;
};

export function GoalListItem({ goal, onPress }: GoalListItemProps) {
  const currency = goal.currency ?? 'EUR';
  const { percent, remaining, isComplete } = getGoalProgress(goal);
  const daysLeft = goal.deadline ? daysUntil(goal.deadline) : null;

  const content = (
    <Card
      variant="elevated"
      style={[styles.card, isComplete && styles.cardComplete]}>
      <View style={styles.header}>
        <View style={[styles.icon, isComplete && styles.iconComplete]}>
          <SymbolView
            name={
              isComplete
                ? { ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }
                : { ios: 'target', android: 'flag', web: 'flag' }
            }
            tintColor={isComplete ? colors.success : colors.primary}
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

        <View style={styles.percentBadge}>
          <Text variant="bodyMedium" color={isComplete ? 'success' : 'primary'}>
            {percent}%
          </Text>
        </View>

        {onPress ? (
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor={colors.textMuted}
            size={14}
          />
        ) : null}
      </View>

      <GoalProgressBar percent={percent} isComplete={isComplete} height={10} />

      <View style={styles.footer}>
        {isComplete ? (
          <Text variant="caption" color="success">
            Objetivo concluído
          </Text>
        ) : (
          <Text variant="caption" color="textSecondary">
            Faltam {formatCurrency(remaining, currency)}
          </Text>
        )}

        {goal.deadline ? (
          <View style={styles.deadlineRow}>
            <SymbolView
              name={{ ios: 'calendar', android: 'event', web: 'event' }}
              tintColor={daysLeft !== null && daysLeft < 0 ? colors.warning : colors.textMuted}
              size={12}
            />
            <Text
              variant="caption"
              color={daysLeft !== null && daysLeft < 0 ? 'warning' : 'textMuted'}>
              {formatDateShort(goal.deadline)}
              {daysLeft !== null ? ` · ${formatRelativeDays(daysLeft)}` : ''}
            </Text>
          </View>
        ) : (
          <Text variant="caption" color="textMuted">
            Sem data prevista
          </Text>
        )}
      </View>

      {isComplete ? (
        <LinearGradient
          colors={['rgba(52,211,153,0.12)', 'transparent']}
          style={styles.completeGlow}
          pointerEvents="none"
        />
      ) : null}
    </Card>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={() => onPress(goal)}
      style={({ pressed }) => [pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Editar objetivo ${goal.name}`}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardComplete: {
    borderColor: colors.success,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconComplete: {
    backgroundColor: colors.successMuted,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  percentBadge: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  completeGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.lg,
  },
  pressed: {
    opacity: 0.92,
  },
});
