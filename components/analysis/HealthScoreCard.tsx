import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Card, Text } from '@/components/ui';
import type { HealthScoreResult } from '@/lib/insights/types';
import { colors, spacing } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 120;
const STROKE = 10;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const STATUS_COLOR: Record<HealthScoreResult['status'], string> = {
  critical: colors.danger,
  warning: colors.warning,
  good: colors.accent,
  excellent: colors.primary,
};

type HealthScoreCardProps = {
  score: HealthScoreResult;
  onPress: () => void;
};

export function HealthScoreCard({ score, onPress }: HealthScoreCardProps) {
  const hasData = score.hasSufficientData;
  const totalScore = hasData && Number.isFinite(score.total) ? Math.max(0, Math.min(100, score.total)) : 0;
  const progress = useSharedValue(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!hasData) return;
    progress.value = withTiming(totalScore / 100, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
    const start = Date.now();
    const from = displayScore;
    const to = totalScore;
    const duration = 900;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setDisplayScore(Math.round(from + (to - from) * t));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [progress, totalScore, hasData, displayScore]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  if (!hasData) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        <Card variant="elevated" style={styles.card}>
          <Text variant="label" color="textMuted">
            Saúde financeira
          </Text>
          <View style={styles.insufficientWrap}>
            <Text variant="h3" align="center">
              Sem dados suficientes
            </Text>
            <Text variant="body" color="textSecondary" align="center" style={styles.insufficientSubtitle}>
              Regista movimentos de rendimento e despesas para calcularmos o teu score.
            </Text>
          </View>
        </Card>
      </Pressable>
    );
  }

  const ringColor = STATUS_COLOR[score.status] ?? colors.textMuted;
  const componentEntries = Object.values(score.components ?? {});

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <Card variant="elevated" style={styles.card}>
        <Text variant="label" color="textMuted">
          Saúde financeira
        </Text>
        <View style={styles.centerRow}>
          <View style={styles.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={colors.surfaceHighlight}
                strokeWidth={STROKE}
                fill="none"
              />
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={ringColor}
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                animatedProps={animatedProps}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <View style={styles.scoreCenter}>
              <Text style={[styles.scoreValue, { color: ringColor }]}>{displayScore}</Text>
              <Text variant="caption" color="textMuted">
                /100
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.grid}>
          {componentEntries.map((c) => (
            <View key={c.label} style={styles.gridItem}>
              <Text variant="caption" color="textMuted">
                {c.score === null
                  ? '— Sem dados'
                  : `${c.hasData ? (c.score >= c.max * 0.5 ? '✅' : '⚠️') : '—'} ${c.label}`}
              </Text>
            </View>
          ))}
        </View>
        {score.scoredComponentCount < 5 ? (
          <Text variant="caption" color="textMuted" align="center">
            {score.scoredComponentCount} de 5 componentes com dados
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  centerRow: {
    alignItems: 'center',
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  gridItem: {
    minWidth: '45%',
  },
  pressed: {
    opacity: 0.94,
  },
  insufficientWrap: {
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  insufficientSubtitle: {
    lineHeight: 22,
    maxWidth: 280,
  },
});
