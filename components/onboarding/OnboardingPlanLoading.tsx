import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { PLAN_LOADING_STAGES } from '@/lib/onboarding/copy';
import { colors, radius, spacing } from '@/lib/theme';

type OnboardingPlanLoadingProps = {
  /** Chamado quando todas as etapas terminam. */
  onComplete?: () => void;
  /** Duração por etapa (ms). */
  stageDurationMs?: number;
};

/**
 * Loading premium do plano — etapas que vão sendo concluídas com check,
 * criando sensação de valor (não instantâneo). Estável: usa apenas timers.
 */
export function OnboardingPlanLoading({
  onComplete,
  stageDurationMs = 1000,
}: OnboardingPlanLoadingProps) {
  const [activeStage, setActiveStage] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: stageDurationMs * PLAN_LOADING_STAGES.length,
      easing: Easing.inOut(Easing.ease),
    });
  }, [progress, stageDurationMs]);

  useEffect(() => {
    if (activeStage >= PLAN_LOADING_STAGES.length) {
      const finishTimer = setTimeout(() => onComplete?.(), 400);
      return () => clearTimeout(finishTimer);
    }

    const timer = setTimeout(() => {
      setActiveStage((stage) => stage + 1);
    }, stageDurationMs);

    return () => clearTimeout(timer);
  }, [activeStage, onComplete, stageDurationMs]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.haloOuter}>
        <View style={styles.haloInner}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>

      <View style={styles.textBlock}>
        <Text variant="h2" align="center">
          A criar o teu plano
        </Text>
        <Text variant="body" color="textSecondary" align="center">
          Estamos a analisar a tua situação para ativar o que faz sentido.
        </Text>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>

      <View style={styles.stages}>
        {PLAN_LOADING_STAGES.map((stage, index) => {
          const done = index < activeStage;
          const current = index === activeStage;
          return (
            <Animated.View
              key={stage}
              entering={FadeIn.delay(index * 120)}
              style={styles.stageRow}>
              <View
                style={[
                  styles.stageDot,
                  done && styles.stageDotDone,
                  current && styles.stageDotCurrent,
                ]}>
                {done ? (
                  <Text variant="caption" color="textInverse" style={styles.stageCheck}>
                    ✓
                  </Text>
                ) : null}
              </View>
              <Text
                variant="bodyMedium"
                color={done || current ? 'text' : 'textMuted'}>
                {stage}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  haloOuter: {
    width: 104,
    height: 104,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
  },
  haloInner: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  textBlock: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  stages: {
    alignSelf: 'stretch',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stageDot: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageDotCurrent: {
    borderColor: colors.primary,
  },
  stageDotDone: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  stageCheck: {
    fontWeight: '700',
    fontSize: 12,
  },
});
