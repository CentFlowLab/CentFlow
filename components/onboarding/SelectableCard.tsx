import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

type SelectableCardProps = {
  emoji: string;
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  index?: number;
};

export function SelectableCard({
  emoji,
  label,
  description,
  selected,
  onPress,
  index = 0,
}: SelectableCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(320)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          selected && styles.cardSelected,
          pressed && styles.cardPressed,
        ]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.text}>
          <Text variant="bodyMedium" style={selected ? styles.labelSelected : undefined}>
            {label}
          </Text>
          {description ? (
            <Text variant="caption" color="textMuted">
              {description}
            </Text>
          ) : null}
        </View>
        <View style={[styles.check, selected && styles.checkSelected]}>
          {selected ? (
            <Text variant="caption" color="textInverse" style={styles.checkMark}>
              ✓
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  cardPressed: {
    opacity: 0.88,
  },
  emoji: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  labelSelected: {
    fontWeight: '600',
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkMark: {
    fontWeight: '700',
    fontSize: 11,
  },
});
