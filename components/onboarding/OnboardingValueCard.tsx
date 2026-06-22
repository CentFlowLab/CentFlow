import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import type { OnboardingValueEstimate } from '@/lib/onboarding/personalization';
import { colors, radius, spacing } from '@/lib/theme';

type OnboardingValueCardProps = {
  estimate: OnboardingValueEstimate;
  index?: number;
};

/** Cartão premium de "valor" — mostra a oportunidade estimada (retenção). */
export function OnboardingValueCard({ estimate, index = 0 }: OnboardingValueCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(360)}>
      <LinearGradient
        colors={[colors.surfaceElevated, colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}>
        <View style={styles.iconWrap}>
          <Text style={styles.emoji}>{estimate.emoji}</Text>
        </View>
        <View style={styles.body}>
          <Text variant="label" color="primary" style={styles.eyebrow}>
            A tua oportunidade
          </Text>
          <Text variant="h3" style={styles.headline}>
            {estimate.headline}
          </Text>
          <Text variant="caption" color="textSecondary" style={styles.detail}>
            {estimate.detail}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
  },
  emoji: {
    fontSize: 26,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    letterSpacing: 0.6,
  },
  headline: {
    lineHeight: 24,
  },
  detail: {
    lineHeight: 19,
  },
});
