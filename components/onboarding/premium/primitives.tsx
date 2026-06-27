import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { haptics } from '@/lib/ui/haptics';
import { colors, radius, spacing } from '@/lib/theme';

/** Cabeçalho premium: eyebrow + título grande + lead curto. Animado. */
export function PremiumHeader({
  eyebrow,
  title,
  lead,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: 'left' | 'center';
}) {
  return (
    <View style={[styles.header, align === 'center' && styles.headerCenter]}>
      {eyebrow ? (
        <Animated.View entering={FadeInDown.duration(360)}>
          <Text variant="label" color="primary" align={align}>
            {eyebrow}
          </Text>
        </Animated.View>
      ) : null}
      <Animated.View entering={FadeInDown.duration(420).delay(40)}>
        <Text variant="display" align={align} style={styles.title}>
          {title}
        </Text>
      </Animated.View>
      {lead ? (
        <Animated.View entering={FadeInDown.duration(420).delay(120)}>
          <Text variant="body" color="textSecondary" align={align} style={styles.lead}>
            {lead}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Card grande de escolha (single ou multi). Escala suave ao toque. */
export function ChoiceCard({
  emoji,
  label,
  description,
  selected,
  onPress,
  index = 0,
  compact = false,
}: {
  emoji?: string;
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  index?: number;
  compact?: boolean;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInDown.duration(380).delay(index * 55)} style={animatedStyle}>
      <Pressable
        onPress={() => {
          haptics.selection();
          onPress();
        }}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 280 });
        }}
        style={[
          styles.choice,
          compact && styles.choiceCompact,
          selected && styles.choiceSelected,
        ]}>
        {emoji ? (
          <View style={styles.choiceEmojiBox}>
            <Text allowFontScaling={false} style={styles.choiceEmoji}>
              {emoji}
            </Text>
          </View>
        ) : null}
        <View style={styles.choiceTextWrap}>
          <Text variant={compact ? 'bodyMedium' : 'h3'} style={styles.choiceLabel}>
            {label}
          </Text>
          {description ? (
            <Text variant="caption" color="textMuted" style={styles.choiceDesc}>
              {description}
            </Text>
          ) : null}
        </View>
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Lista vertical de cards de escolha com gap consistente. */
export function ChoiceList({ children }: { children: ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  headerCenter: {
    alignItems: 'center',
  },
  title: {
    lineHeight: 40,
  },
  lead: {
    lineHeight: 23,
  },
  list: {
    gap: spacing.md,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceCompact: {
    paddingVertical: spacing.md,
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  choiceEmojiBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceEmoji: {
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
  },
  choiceTextWrap: {
    flex: 1,
    gap: 3,
  },
  choiceLabel: {
    fontWeight: '600',
  },
  choiceDesc: {
    lineHeight: 18,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
});
