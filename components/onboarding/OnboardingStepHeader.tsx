import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/ui';
import type { StepReason } from '@/lib/onboarding/copy';
import { colors, radius, spacing } from '@/lib/theme';

type OnboardingStepHeaderProps = {
  title: string;
  lead?: string;
  context?: string;
  /** Pequeno rótulo acima do título (ex. "Passo 2 de 6"). */
  eyebrow?: string;
  /** Cartão "porquê perguntamos / o que desbloqueia". */
  reason?: StepReason;
};

export function OnboardingStepHeader({
  title,
  lead,
  context,
  eyebrow,
  reason,
}: OnboardingStepHeaderProps) {
  return (
    <Animated.View entering={FadeInDown.duration(320)} style={styles.wrap}>
      {eyebrow ? (
        <Text variant="label" color="primary" style={styles.eyebrow}>
          {eyebrow}
        </Text>
      ) : null}

      <Text variant="h1" style={styles.title}>
        {title}
      </Text>

      {lead ? (
        <Text variant="body" color="textSecondary" style={styles.lead}>
          {lead}
        </Text>
      ) : null}

      {reason ? (
        <View style={styles.reasonCard}>
          <View style={styles.reasonIcon}>
            <SymbolView
              name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
              tintColor={colors.primary}
              size={16}
            />
          </View>
          <View style={styles.reasonBody}>
            <Text variant="caption" color="textSecondary" style={styles.reasonWhy}>
              {reason.why}
            </Text>
            <Text variant="caption" color="primary" style={styles.reasonUnlocks}>
              {reason.unlocks}
            </Text>
          </View>
        </View>
      ) : null}

      {context ? (
        <View style={styles.contextBox}>
          <Text variant="caption" color="textMuted" style={styles.context}>
            {context}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  eyebrow: {
    letterSpacing: 0.6,
  },
  title: {
    lineHeight: 36,
  },
  lead: {
    lineHeight: 24,
  },
  reasonCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  reasonIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
  },
  reasonBody: {
    flex: 1,
    gap: 2,
  },
  reasonWhy: {
    lineHeight: 18,
  },
  reasonUnlocks: {
    fontWeight: '600',
    lineHeight: 18,
  },
  contextBox: {
    paddingTop: spacing.xs,
  },
  context: {
    lineHeight: 20,
  },
});
