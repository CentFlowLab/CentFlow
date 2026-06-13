import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius } from '@/lib/theme';

type GoalProgressBarProps = {
  percent: number;
  isComplete?: boolean;
  height?: number;
  showLabel?: boolean;
};

export function GoalProgressBar({
  percent,
  isComplete = false,
  height = 8,
  showLabel = false,
}: GoalProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const fillColors: [string, string] = isComplete
    ? [colors.success, colors.primaryDark]
    : [colors.primary, colors.primaryDark];

  return (
    <View style={styles.wrapper}>
      <View style={[styles.track, { height }]}>
        {clamped > 0 ? (
          <LinearGradient
            colors={fillColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${clamped}%`, height }]}
          />
        ) : null}
      </View>
      {showLabel ? (
        <Text variant="caption" color={isComplete ? 'success' : 'primary'}>
          {clamped}%
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.full,
  },
});
