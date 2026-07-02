import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useRef } from 'react';

import { useBottomSheetScroll } from '@/components/layout/BottomSheetScrollContext';

import { logAppError } from '@/lib/diagnostics';
import type { OcrConfidenceLevel } from '@/lib/receipt/ocr-confidence';
import { getOcrFieldTone } from '@/lib/receipt/ocr-confidence';
import { colors, layout, radius, spacing } from '@/lib/theme';

import { Text } from './Text';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  /** Destaque visual quando o valor veio do OCR e ainda não foi editado */
  ocrHighlighted?: boolean;
  /** Campo veio do OCR mas foi alterado pelo utilizador */
  ocrEdited?: boolean;
  /** Nível de confiança do OCR para cores do campo */
  ocrConfidenceLevel?: OcrConfidenceLevel;
  diagnosticField?: string;
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
  ocrEdited,
  ocrConfidenceLevel,
  diagnosticField,
  style,
  onFocus,
  onChangeText,
  ...props
}: TextFieldProps) {
  const level = ocrConfidenceLevel ?? 'unknown';
  const ocrTone = ocrHighlighted ? getOcrFieldTone(level) : null;
  const sheetScroll = useBottomSheetScroll();
  const inputRef = useRef<TextInput>(null);
  const fieldName = diagnosticField ?? label;

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (event) => {
    try {
      onFocus?.(event);
    } catch (error) {
      logAppError('movement_create', error, {
        screen: 'movement_create',
        action: 'input_focus',
        component: 'TextField',
        field: fieldName,
        severity: 'high',
      });
    }

    try {
      sheetScroll?.scrollToInput(inputRef.current, { field: fieldName });
    } catch (error) {
      logAppError('movement_create', error, {
        screen: 'movement_create',
        action: 'input_focus',
        component: 'TextField',
        field: fieldName,
        severity: 'high',
      });
    }
  };

  const handleChangeText: NonNullable<TextInputProps['onChangeText']> = (text) => {
    try {
      onChangeText?.(text);
    } catch (error) {
      logAppError('movement_create', error, {
        screen: 'movement_create',
        action: 'input_change',
        component: 'TextField',
        field: fieldName,
        severity: 'high',
      });
    }
  };

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
        {ocrEdited ? (
          <View style={[styles.ocrBadge, styles.editedBadge]}>
            <Text variant="caption" style={styles.editedBadgeText}>
              Editado
            </Text>
          </View>
        ) : null}
      </View>
      <TextInput
        ref={inputRef}
        placeholderTextColor={colors.textMuted}
        onFocus={handleFocus}
        onChangeText={handleChangeText}
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
    gap: spacing.sm,
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
  editedBadge: {
    backgroundColor: colors.surfaceHighlight,
  },
  editedBadgeText: {
    fontWeight: '600',
    fontSize: 10,
    color: colors.textMuted,
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
    minHeight: layout.inputHeight,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    marginTop: spacing.xs,
  },
});
