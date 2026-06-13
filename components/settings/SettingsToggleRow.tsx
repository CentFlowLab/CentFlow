import { StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

type SettingsToggleRowProps = {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export function SettingsToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
}: SettingsToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="bodyMedium">{label}</Text>
        <Text variant="caption" color="textMuted">
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.surfaceHighlight, true: colors.primaryMuted }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
});
