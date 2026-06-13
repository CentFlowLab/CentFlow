import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { countOcrFilledFields } from '@/lib/domain/receipt-confirmation';
import type { ReceiptOcrResult } from '@/lib/domain/receipt.types';
import {
  getOcrConfidenceTone,
  getOcrSourceLabel,
} from '@/lib/receipt/ocr-confidence';
import { colors, spacing } from '@/lib/theme';

import { OcrFieldsChecklist } from './ocr/OcrFieldsChecklist';

type OcrDetectionSummaryProps = {
  ocr: ReceiptOcrResult;
};

export function OcrDetectionSummary({ ocr }: OcrDetectionSummaryProps) {
  const tone = getOcrConfidenceTone(ocr.confidence, ocr.source);
  const filledFields = countOcrFilledFields(ocr);
  const itemCount = ocr.items?.length ?? 0;

  return (
    <Card variant="outlined" style={[styles.card, { borderColor: tone.color }]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <SymbolView
              name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
              tintColor={tone.color}
              size={18}
            />
            <Text variant="bodyMedium">Leitura automática</Text>
          </View>
          <Text variant="caption" color="textMuted">
            {getOcrSourceLabel(ocr.source)} · {filledFields} campos · {itemCount} itens
          </Text>
        </View>

        <View style={[styles.confidenceBadge, { backgroundColor: tone.bg }]}>
          <SymbolView
            name={{
              ios:
                tone.level === 'high'
                  ? 'checkmark.seal.fill'
                  : tone.level === 'medium'
                    ? 'exclamationmark.triangle.fill'
                    : 'questionmark.circle.fill',
              android: tone.level === 'high' ? 'verified' : 'info',
              web: tone.level === 'high' ? 'verified' : 'info',
            }}
            tintColor={tone.color}
            size={14}
          />
          <Text variant="caption" style={[styles.confidenceText, { color: tone.color }]}>
            {tone.label}
          </Text>
        </View>
      </View>

      <OcrFieldsChecklist ocr={ocr} />

      <Text variant="caption" color="textSecondary">
        Campos com badge colorido ainda têm o valor detetado. Verde = alta confiança, amarelo =
        rever, vermelho = provável erro.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confidenceText: {
    fontWeight: '700',
    fontSize: 12,
  },
});
