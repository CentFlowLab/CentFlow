import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { getValuePromiseBullets, type ValuePromiseBullet } from '@/lib/onboarding/welcome';
import { colors, radius, spacing } from '@/lib/theme';

type ValuePromiseSectionProps = {
  messages: string[];
  bullets?: ValuePromiseBullet[];
};

export function ValuePromiseSection({
  messages,
  bullets = getValuePromiseBullets(),
}: ValuePromiseSectionProps) {
  return (
    <View style={styles.container}>
      {messages.map((message, index) => (
        <Animated.View
          key={`${message}-${index}`}
          entering={FadeIn.delay(index * 200).duration(400)}
          style={[styles.bubble, index === 0 ? styles.bubbleHero : null]}>
          <Text
            variant={index === 0 ? 'h2' : 'body'}
            color={index === 0 ? 'text' : 'textSecondary'}
            style={styles.message}>
            {message}
          </Text>
        </Animated.View>
      ))}

      <Animated.View entering={FadeIn.delay(messages.length * 200 + 100).duration(400)}>
        <View style={styles.bulletCard}>
          <Text variant="bodyMedium" style={styles.bulletTitle}>
            Vou ajudar-te a:
          </Text>
          {bullets.map((bullet) => (
            <View key={bullet.text} style={styles.bulletRow}>
              <Text variant="bodyMedium" color="success">
                {bullet.emoji}
              </Text>
              <Text variant="body" color="textSecondary" style={styles.bulletText}>
                {bullet.text}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  bubble: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleHero: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  message: {
    lineHeight: 26,
  },
  bulletCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  bulletTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletText: {
    flex: 1,
    lineHeight: 22,
  },
});
