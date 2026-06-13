import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { OcrConfidenceLevel } from '@/lib/receipt/ocr-confidence';
import { colors, radius, spacing } from '@/lib/theme';

type OcrFieldBadgeProps = {
  level?: OcrConfidenceLevel;
  label?: string;
  compact?: boolean;
};

const LEVEL_LABELS: Record<OcrConfidenceLevel, string> = {
  high: 'OCR alto',
  medium: 'OCR médio',
  low: 'OCR baixo',
  unknown: 'OCR',
};

const LEVEL_COLORS: Record<OcrConfidenceLevel, { text: string; bg: string }> = {
  high: { text: colors.success, bg: colors.successMuted },
  medium: { text: colors.warning, bg: colors.accentMuted },
  low: { text: colors.danger, bg: colors.dangerMuted },
  unknown: { text: colors.accent, bg: colors.accentMuted },
};

export function OcrFieldBadge({
  level = 'unknown',
  label,
  compact = false,
}: OcrFieldBadgeProps) {
  const palette = LEVEL_COLORS[level];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, compact && styles.compact]}>
      <Text
        variant="caption"
        style={[styles.text, { color: palette.text }, compact && styles.compactText]}>
        {label ?? LEVEL_LABELS[level]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  compact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontWeight: '700',
    fontSize: 10,
  },
  compactText: {
    fontSize: 9,
  },
});
