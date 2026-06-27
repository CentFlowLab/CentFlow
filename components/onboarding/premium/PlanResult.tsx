import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui';
import { calculateOnboardingPlan } from '@/lib/onboarding/plan';
import { colors, radius, spacing } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 200;
const STROKE = 18;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

function euro(value: number): string {
  const rounded = Math.round(value);
  return `${String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009')} €`;
}

type PlanResultProps = {
  savingsGoal: number;
  months: number;
  monthlyIncome: number | null;
  firstName?: string;
};

export function PlanResult({ savingsGoal, months, monthlyIncome, firstName }: PlanResultProps) {
  const plan = calculateOnboardingPlan({
    savingsGoal,
    months,
    monthlyIncome: monthlyIncome ?? 0,
  });

  const progress = useSharedValue(0);
  const target = plan.effortRatio != null ? Math.min(1, plan.effortRatio) : 0.5;

  useEffect(() => {
    progress.value = withTiming(target, { duration: 1100 });
  }, [progress, target]);

  const circleProps = useAnimatedProps(() => ({
    strokeDashoffset: C * (1 - progress.value),
  }));

  const warning = plan.warnings[0];
  const warningCopy: Record<string, { tone: string; text: string }> = {
    EXCEEDS_INCOME: {
      tone: colors.danger,
      text: 'Este ritmo ultrapassa o teu rendimento. Considera mais tempo.',
    },
    AGGRESSIVE: {
      tone: colors.warning,
      text: 'É um plano ambicioso — exigente mas possível.',
    },
    COMFORTABLE: {
      tone: colors.success,
      text: 'Um plano confortável e sustentável. Boa escolha.',
    },
    NO_INCOME: {
      tone: colors.textMuted,
      text: 'Adiciona o teu rendimento para veres quanto fica livre.',
    },
  };
  const note = warning ? warningCopy[warning] : null;

  return (
    <View style={styles.wrap}>
      <Animated.View entering={FadeIn.duration(500)} style={styles.chartWrap}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={colors.surfaceHighlight}
            strokeWidth={STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={colors.primary}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={C}
            animatedProps={circleProps}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.chartCenter}>
          <Text variant="label" color="textMuted">
            Por mês
          </Text>
          <Text
            style={styles.bigNumber}
            numberOfLines={1}
            adjustsFontSizeToFit
            allowFontScaling={false}>
            {euro(plan.monthlySaving)}
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(450).delay(250)}>
        <Text variant="body" color="textSecondary" align="center" style={styles.explain}>
          {firstName ? `${firstName}, para` : 'Para'} atingires{' '}
          <Text variant="bodyMedium" color="text">
            {euro(savingsGoal)}
          </Text>{' '}
          em{' '}
          <Text variant="bodyMedium" color="text">
            {months} {months === 1 ? 'mês' : 'meses'}
          </Text>{' '}
          basta reservares cerca de{' '}
          <Text variant="bodyMedium" color="primary">
            {euro(plan.monthlySaving)}
          </Text>{' '}
          por mês.
        </Text>
      </Animated.View>

      {plan.freePerMonth != null ? (
        <Animated.View
          entering={FadeInDown.duration(450).delay(380)}
          style={styles.freeCard}>
          <Text variant="caption" color="textMuted">
            Continuas com
          </Text>
          <Text variant="h1" color="success" style={styles.freeAmount}>
            ~{euro(Math.max(0, plan.freePerMonth))}
          </Text>
          <Text variant="caption" color="textMuted">
            livres por mês
          </Text>
        </Animated.View>
      ) : null}

      {note ? (
        <Animated.View entering={FadeIn.duration(400).delay(500)}>
          <View style={[styles.noteChip, { borderColor: note.tone }]}>
            <Text variant="caption" color={note.tone} align="center">
              {note.text}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.xl,
  },
  chartWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: STROKE + spacing.sm,
  },
  bigNumber: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.text,
    textAlign: 'center',
  },
  explain: {
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  freeCard: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['3xl'],
    borderRadius: radius.lg,
    backgroundColor: colors.successMuted,
    borderWidth: 1,
    borderColor: colors.success,
  },
  freeAmount: {
    fontWeight: '800',
  },
  noteChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
});
