import { View } from 'react-native';

import { radius, useTheme, type ThemeColors } from '../theme';

type Props = {
  /** Valor entre 0 e 1; valores acima de 1 são mostrados como cheios. */
  progress: number;
  /** Rótulo para leitores de ecrã (ex.: "Alimentação: 80% utilizado"). */
  accessibilityLabel: string;
  tone?: 'accent' | 'positive' | 'warning' | 'negative';
  height?: number;
};

const TONE_COLOR: Record<NonNullable<Props['tone']>, keyof ThemeColors> = {
  accent: 'primary',
  positive: 'positive',
  warning: 'warning',
  negative: 'negative',
};

export function ProgressBar({ progress, accessibilityLabel, tone = 'accent', height = 8 }: Props) {
  const { colors } = useTheme();
  const clamped = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceMuted,
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: radius.full,
          backgroundColor: colors[TONE_COLOR[tone]],
        }}
      />
    </View>
  );
}
