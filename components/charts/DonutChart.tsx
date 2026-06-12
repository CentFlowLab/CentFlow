import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

export type DonutSegment = {
  value: number;
  color: string;
  label: string;
};

type DonutChartProps = {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
};

export function DonutChart({
  segments,
  size = 180,
  strokeWidth = 22,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  if (total <= 0) {
    return (
      <View style={[styles.empty, { width: size, height: size }]}>
        <Text variant="caption" color="textMuted" align="center">
          Sem dados
        </Text>
      </View>
    );
  }

  let cumulativeOffset = 0;

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.surfaceHighlight}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {segments.map((segment, index) => {
            const fraction = segment.value / total;
            const dashLength = circumference * fraction;
            const dashGap = circumference - dashLength;
            const offset = -cumulativeOffset;
            cumulativeOffset += dashLength;

            return (
              <Circle
                key={`${segment.label}-${index}`}
                cx={center}
                cy={center}
                r={radius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${dashLength} ${dashGap}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            );
          })}
        </G>
      </Svg>

      {(centerLabel || centerValue) && (
        <View style={[styles.center, { width: size, height: size }]}>
          {centerValue && (
            <Text variant="h3" align="center" numberOfLines={1} adjustsFontSizeToFit>
              {centerValue}
            </Text>
          )}
          {centerLabel && (
            <Text variant="caption" color="textMuted" align="center">
              {centerLabel}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
