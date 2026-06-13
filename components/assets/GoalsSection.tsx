import { StyleSheet, View } from 'react-native';

import { Card, SectionHeader, Text } from '@/components/ui';
import type { Goal } from '@/lib/domain/assets.types';
import { getGoalsAggregate } from '@/lib/domain/goal.utils';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

import { ASSETS_SECTION_META } from './assets.config';
import { GoalListItem } from './GoalListItem';
import { GoalProgressBar } from './GoalProgressBar';
import { GoalsEmptyState } from './GoalsEmptyState';
import { SwipeableAssetRow } from './SwipeableAssetRow';

type GoalsSectionProps = {
  goals: Goal[];
  onAdd?: () => void;
  onEdit?: (goal: Goal) => void;
  onLearnMore?: () => void;
  onDelete?: (goal: Goal) => void;
};

export function GoalsSection({ goals, onAdd, onEdit, onLearnMore, onDelete }: GoalsSectionProps) {
  const meta = ASSETS_SECTION_META.objetivos;

  if (goals.length === 0) {
    return (
      <View style={styles.container}>
        <SectionHeader title={meta.title} subtitle={meta.subtitle} />
        <GoalsEmptyState onCreate={onAdd} onLearnMore={onLearnMore} />
      </View>
    );
  }

  const aggregate = getGoalsAggregate(goals);

  return (
    <View style={styles.container}>
      <SectionHeader
        title={meta.title}
        subtitle={`${goals.length} objetivo${goals.length === 1 ? '' : 's'} activo${goals.length === 1 ? '' : 's'}`}
        actionLabel={meta.addLabel}
        onAction={onAdd}
      />

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
