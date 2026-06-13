import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

type HomeQuickActionsProps = {
  onAddMovement: () => void;
  onViewMovements: () => void;
  onNewGoal?: () => void;
};

export function HomeQuickActions({
  onAddMovement,
  onViewMovements,
  onNewGoal,
}: HomeQuickActionsProps) {
  return (
    <View style={styles.container}>
      <Button
        label="+ Movimento"
        onPress={onAddMovement}
        fullWidth
        size="lg"
        icon={
          <SymbolView
            name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
            tintColor={colors.textInverse}
            size={18}
          />
        }
      />
      <View style={styles.row}>
        <Button
          label="Ver movimentos"
          variant="secondary"
          onPress={onViewMovements}
          style={styles.half}
        />
        {onNewGoal ? (
          <Button
            label="Novo objetivo"
            variant="ghost"
            onPress={onNewGoal}
            style={styles.half}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing['2xl'],
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
});
