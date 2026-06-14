import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { spacing } from '@/lib/theme';

type AssetsTabToolbarProps = {
  label: string;
};

export function AssetsTabToolbar({ label }: AssetsTabToolbarProps) {
  return (
    <View style={styles.row}>
      <Text variant="bodyMedium" color="textSecondary">
        {label}
      </Text>
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
