import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { ReceiptOcrResult } from '@/lib/domain/receipt.types';
import {
  OCR_FIELD_LABELS,
  type OcrFieldKey,
  getMissingOcrFields,
  getOcrFieldConfidence,
} from '@/lib/receipt/ocr-confidence';
import { colors, radius, spacing } from '@/lib/theme';

import { OcrFieldBadge } from './OcrFieldBadge';

type OcrFieldsChecklistProps = {
  ocr: ReceiptOcrResult;
};

const PRIMARY_FIELDS: OcrFieldKey[] = ['merchantName', 'amount', 'date', 'category'];

export function OcrFieldsChecklist({ ocr }: OcrFieldsChecklistProps) {
  const missing = getMissingOcrFields(ocr);

  return (
    <View style={styles.container}>
      <Text variant="caption" color="textMuted" style={styles.title}>
        Campos detetados
      </Text>
      <View style={styles.grid}>
        {PRIMARY_FIELDS.map((field) => {
          const detected = !missing.includes(field);
          const level = getOcrFieldConfidence(ocr, field);

          return (
            <View
              key={field}
              style={[
                styles.chip,
                detected ? styles.chipDetected : styles.chipMissing,
              ]}>
              <SymbolView
                name={{
                  ios: detected ? 'checkmark.circle.fill' : 'xmark.circle',
                  android: detected ? 'check_circle' : 'cancel',
                  web: detected ? 'check_circle' : 'cancel',
                }}
                tintColor={detected ? colors.success : colors.textMuted}
                size={14}
              />
              <Text variant="caption" color={detected ? 'text' : 'textMuted'}>
                {OCR_FIELD_LABELS[field]}
              </Text>
              {detected ? <OcrFieldBadge level={level} compact /> : null}
            </View>
          );
        })}
      </View>
      {missing.length > 0 ? (
        <Text variant="caption" color="textSecondary">
          Preenche manualmente: {missing.map((f) => OCR_FIELD_LABELS[f]).join(', ')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  chipDetected: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipMissing: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceHighlight,
    borderStyle: 'dashed',
  },
});
