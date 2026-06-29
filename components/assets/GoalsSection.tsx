import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { Goal } from '@/lib/domain/assets.types';
import { getGoalsAggregate } from '@/lib/domain/goal.utils';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

import { GoalListItem } from './GoalListItem';
import { GoalProgressBar } from './GoalProgressBar';
import { GoalsEmptyState } from './GoalsEmptyState';
import { SwipeableAssetRow } from './SwipeableAssetRow';

type GoalsSectionProps = {
  goals: Goal[];
  onEdit?: (goal: Goal) => void;
  onLearnMore?: () => void;
  onPrimaryAction?: () => void;
  onDelete?: (goal: Goal) => void;
};

export function GoalsSection({ goals, onEdit, onLearnMore, onPrimaryAction, onDelete }: GoalsSectionProps) {
  if (goals.length === 0) {
    return (
      <View style={styles.container}>
        <GoalsEmptyState onLearnMore={onLearnMore} onPrimaryAction={onPrimaryAction} />
      </View>
    );
  }

  const aggregate = getGoalsAggregate(goals);

  return (
    <View style={styles.container}>
      <Card variant="outlined" style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text variant="caption" color="textMuted">
              Total poupado
            </Text>
            <Text variant="h3" color="primary">
              {formatCurrency(aggregate.totalCurrent)}
            </Text>
          </View>
          <View style={styles.summaryRight}>
            <Text variant="caption" color="textMuted" align="right">
              Meta combinada
            </Text>
            <Text variant="bodyMedium" align="right">
              {formatCurrency(aggregate.totalTarget)}
            </Text>
          </View>
        </View>
        <GoalProgressBar percent={aggregate.percent} showLabel height={8} />
        <Text variant="caption" color="textMuted">
          O valor poupado nos objetivos é acompanhado à parte e não é contado duas vezes no
          património líquido.
        </Text>
      </Card>

      <View style={styles.list}>
        {goals.map((goal) => (
          <SwipeableAssetRow
            key={goal.id}
            label={goal.name}
            onDelete={() => onDelete?.(goal)}>
            <GoalListItem goal={goal} onPress={onEdit} />
          </SwipeableAssetRow>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 280,
  },
  summaryCard: {
    gap: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.backgroundElevated,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  summaryRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  list: {
    flex: 1,
  },
});
