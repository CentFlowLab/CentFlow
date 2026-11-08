import { View } from 'react-native';

import { radius, spacing, useTheme, type ThemeColors } from '../theme';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'accent' | 'positive' | 'negative' | 'warning';

const TONES: Record<BadgeTone, { background: keyof ThemeColors; text: keyof ThemeColors }> = {
  neutral: { background: 'surfaceMuted', text: 'textSecondary' },
  accent: { background: 'primaryMuted', text: 'primaryText' },
  positive: { background: 'positiveMuted', text: 'positive' },
  negative: { background: 'negativeMuted', text: 'negative' },
  warning: { background: 'warningMuted', text: 'warning' },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { colors } = useTheme();
  const palette = TONES[tone];
  return (
    <View
      style={{
        backgroundColor: colors[palette.background],
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
      }}>
      <Text variant="caption" style={{ color: colors[palette.text] }}>
        {label}
      </Text>
    </View>
  );
}
