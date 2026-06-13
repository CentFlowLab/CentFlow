import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import type { OcrConfidenceLevel } from '@/lib/receipt/ocr-confidence';
import { getOcrFieldTone } from '@/lib/receipt/ocr-confidence';
import { colors, radius, spacing } from '@/lib/theme';

import { Text } from './Text';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  /** Destaque visual quando o valor veio do OCR e ainda não foi editado */
  ocrHighlighted?: boolean;
  /** Nível de confiança do OCR para cores do campo */
  ocrConfidenceLevel?: OcrConfidenceLevel;
};

const OCR_BADGE_LABELS: Record<OcrConfidenceLevel, string> = {
  high: 'OCR alto',
  medium: 'OCR médio',
  low: 'OCR baixo',
  unknown: 'OCR',
};

export function TextField({
  label,
  error,
  ocrHighlighted,
  ocrConfidenceLevel,
  style,
  ...props
}: TextFieldProps) {
  const level = ocrConfidenceLevel ?? 'unknown';
  const ocrTone = ocrHighlighted ? getOcrFieldTone(level) : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text variant="caption" color="textSecondary" style={styles.label}>
          {label}
        </Text>
        {ocrHighlighted ? (
          <View style={[styles.ocrBadge, { backgroundColor: ocrTone?.badgeBg }]}>
            <Text variant="caption" style={[styles.ocrBadgeText, { color: ocrTone?.badge }]}>
              {OCR_BADGE_LABELS[level]}
            </Text>
          </View>
        ) : null}
      </View>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          ocrTone && {
            borderColor: ocrTone.border,
            backgroundColor: ocrTone.background,
          },
          error && styles.inputError,
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontWeight: '500',
  },
  ocrBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  ocrBadgeText: {
    fontWeight: '700',
    fontSize: 10,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    minHeight: 48,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    marginTop: spacing.xs,
  },
});
