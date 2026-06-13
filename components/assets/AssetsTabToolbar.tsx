import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { spacing } from '@/lib/theme';

type AssetsTabToolbarProps = {
  label: string;
  addLabel: string;
  onAdd?: () => void;
};

export function AssetsTabToolbar({ label, addLabel, onAdd }: AssetsTabToolbarProps) {
  return (
    <View style={styles.row}>
      <Text variant="bodyMedium" color="textSecondary">
        {label}
      </Text>
      {onAdd ? (
        <Button label={addLabel} variant="secondary" size="sm" onPress={onAdd} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
});
