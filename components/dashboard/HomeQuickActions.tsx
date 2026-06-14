import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

export type RecommendedQuickAction = {
  key: string;
  label: string;
  onPress: () => void;
};

type HomeQuickActionsProps = {
  onAddMovement: () => void;
  onViewMovements: () => void;
  onNewGoal?: () => void;
  /** Actions recommended based on the user's onboarding profile (shown first, more prominent) */
  recommendedActions?: RecommendedQuickAction[];
};

export function HomeQuickActions({
  onAddMovement,
  onViewMovements,
  onNewGoal,
  recommendedActions = [],
}: HomeQuickActionsProps) {
  return (
    <View style={styles.container}>
      {/* Personalized recommendations from onboarding (e.g. "Digitalizar talão" or "Criar objetivo") */}
      {recommendedActions.length > 0 && (
        <View style={styles.recommended}>
          {recommendedActions.map((action) => (
            <Button
              key={action.key}
              label={action.label}
              onPress={action.onPress}
              fullWidth
              size="lg"
              icon={
                <SymbolView
                  name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                  tintColor={colors.textInverse}
                  size={18}
                />
              }
            />
          ))}
        </View>
      )}

      <Button
        label="+ Movimento"
        onPress={onAddMovement}
        fullWidth
        size="lg"
        variant={recommendedActions.length > 0 ? 'secondary' : 'primary'}
        icon={
          <SymbolView
            name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
            tintColor={recommendedActions.length > 0 ? colors.text : colors.textInverse}
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
  recommended: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
});
