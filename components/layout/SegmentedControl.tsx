import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, pressScale, radius, spacing } from '@/lib/theme';

type Segment<T extends string> = {
  key: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {segments.map((segment) => {
          const isActive = segment.key === value;

          return (
            <Pressable
              key={segment.key}
              onPress={() => onChange(segment.key)}
              style={({ pressed }) => [
                styles.segment,
                isActive && styles.segmentActive,
                pressed && styles.segmentPressed,
              ]}>
              <Text
                variant="caption"
                color={isActive ? 'primary' : 'textMuted'}
                style={isActive ? styles.activeLabel : undefined}>
                {segment.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  segmentActive: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  segmentPressed: {
    opacity: 0.88,
    transform: [{ scale: pressScale.chip }],
  },
  activeLabel: {
    fontWeight: '600',
  },
});
