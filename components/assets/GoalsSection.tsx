import { StyleSheet, View } from 'react-native';

import type { Goal } from '@/lib/domain/assets.types';

import { AssetsSectionShell } from './AssetsSectionShell';
import { GoalListItem } from './GoalListItem';
import { SwipeableAssetRow } from './SwipeableAssetRow';

type GoalsSectionProps = {
  goals: Goal[];
  onAdd?: () => void;
  onLearnMore?: () => void;
  onDelete?: (goal: Goal) => void;
};

export function GoalsSection({ goals, onAdd, onLearnMore, onDelete }: GoalsSectionProps) {
  return (
    <AssetsSectionShell tab="objetivos" count={goals.length} onAdd={onAdd} onLearnMore={onLearnMore}>
      <View style={styles.list}>
        {goals.map((goal) => (
          <SwipeableAssetRow
            key={goal.id}
            label={goal.name}
            onDelete={() => onDelete?.(goal)}>
            <GoalListItem goal={goal} />
          </SwipeableAssetRow>
        ))}
      </View>
    </AssetsSectionShell>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
});
