import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

type HomeQuickActionsProps = {
  onAddMovement: () => void;
  onAddAsset: () => void;
  onAddGoal: () => void;
};

/** Acções rápidas fixas no fundo do Início — sem ruído extra. */
export function HomeQuickActions({
  onAddMovement,
  onAddAsset,
  onAddGoal,
}: HomeQuickActionsProps) {
  return (
    <View style={styles.container}>
      <Button
        label="Novo movimento"
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
          label="Novo ativo"
          variant="secondary"
          onPress={onAddAsset}
          style={styles.half}
        />
        <Button
          label="Novo objetivo"
          variant="secondary"
          onPress={onAddGoal}
          style={styles.half}
        />
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
