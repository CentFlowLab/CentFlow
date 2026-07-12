import Slider from '@react-native-community/slider';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

type SettingsThresholdSliderProps = {
  label: string;
  description: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  formatValue: (value: number) => string;
  onValueChange: (value: number) => void;
  disabled?: boolean;
};

export function SettingsThresholdSlider({
  label,
  description,
  value,
  minimumValue,
  maximumValue,
  step,
  formatValue,
  onValueChange,
  disabled,
}: SettingsThresholdSliderProps) {
  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      <View style={styles.text}>
        <Text variant="bodyMedium">{label}</Text>
        <Text variant="caption" color="textMuted">
          {description}
        </Text>
        <Text variant="caption" color="primary">
          {formatValue(value)}
        </Text>
      </View>
      <Slider
        style={styles.slider}
        value={value}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        onSlidingComplete={onValueChange}
        disabled={disabled}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.surfaceHighlight}
        thumbTintColor={colors.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
  },
  text: {
    gap: spacing.xs,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  disabled: {
    opacity: 0.5,
  },
});
