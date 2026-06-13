import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { ReceiptOcrResult } from '@/lib/domain/receipt.types';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';
import { getCategoryLabel } from '@/lib/data/transaction-categories';

type OcrResultCardProps = {
  ocr: ReceiptOcrResult;
};

function confidenceTone(confidence?: number): {
  label: string;
  color: string;
  bg: string;
} {
  const pct = confidence !== undefined ? Math.round(confidence * 100) : null;
  if (pct === null) {
    return { label: 'Sem confiança', color: colors.textMuted, bg: colors.surface };
  }
  if (pct >= 70) {
    return { label: `${pct}% confiança`, color: colors.success, bg: colors.successMuted };
  }
  if (pct >= 45) {
    return { label: `${pct}% confiança`, color: colors.warning, bg: colors.accentMuted };
  }
  return { label: `${pct}% confiança — rever`, color: colors.danger, bg: colors.dangerMuted };
}

function sourceLabel(source?: ReceiptOcrResult['source']): string {
  if (source === 'device') return 'Leitura no dispositivo';
  if (source === 'demo') return 'Dados de demonstração';
  return 'Leitura automática';
}

export function OcrResultCard({ ocr }: OcrResultCardProps) {
  const tone = confidenceTone(ocr.source === 'demo' ? 40 : ocr.confidence);
  const items = ocr.items ?? [];

  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <SymbolView
            name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
            tintColor={colors.accent}
            size={18}
          />
          <Text variant="bodyMedium">{sourceLabel(ocr.source)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: tone.bg }]}>
          <Text variant="caption" style={[styles.badgeText, { color: tone.color }]}>
            {tone.label}
          </Text>
        </View>
      </View>

      <Text variant="caption" color="textMuted">
        Verifica os campos abaixo. Podes editar ou ignorar o OCR.
      </Text>

      <View style={styles.rows}>
        <InfoRow label="Loja" value={ocr.merchantName} placeholder="Não detectada" />
        <InfoRow
          label="Total"
          value={
            ocr.totalAmount !== undefined ? formatCurrency(ocr.totalAmount) : undefined
          }
          placeholder="Não detectado"
          highlight
        />
        <InfoRow
          label="Data"
          value={ocr.date ? formatDateShort(ocr.date) : undefined}
          placeholder="Não detectada"
        />
        <InfoRow
          label="Categoria"
          value={
            ocr.suggestedCategory
              ? getCategoryLabel(ocr.suggestedCategory, 'expense')
              : undefined
          }
          placeholder="Não sugerida"
        />
      </View>

      {items.length > 0 ? (
        <View style={styles.items}>
          <Text variant="caption" color="textMuted" style={styles.itemsTitle}>
            Itens detectados ({items.length})
          </Text>
          <ScrollView
            style={styles.itemsScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}>
            {items.map((item, index) => (
              <View key={`${item.name}-${index}`} style={styles.itemRow}>
                <View style={styles.itemIndex}>
                  <Text variant="caption" color="textMuted">
                    {index + 1}
                  </Text>
                </View>
                <Text variant="caption" color="textSecondary" style={styles.itemName} numberOfLines={2}>
                  {item.name}
                </Text>
                <View style={styles.itemPrices}>
                  {item.quantity !== undefined && item.quantity > 1 ? (
                    <Text variant="caption" color="textMuted">
                      {item.quantity}×
                    </Text>
                  ) : null}
                  {item.total !== undefined ? (
                    <Text variant="caption" color="text" style={styles.itemTotal}>
                      {formatCurrency(item.total)}
                    </Text>
                  ) : item.unitPrice !== undefined ? (
                    <Text variant="caption" color="textMuted">
                      {formatCurrency(item.unitPrice)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Card>
  );
}

function InfoRow({
  label,
  value,
  placeholder,
  highlight,
}: {
  label: string;
  value?: string;
  placeholder: string;
  highlight?: boolean;
}) {
  const missing = !value;

  return (
    <View style={[styles.row, highlight && styles.rowHighlight]}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text
        variant="caption"
        color={missing ? 'textMuted' : 'textSecondary'}
        style={missing ? styles.placeholder : styles.value}>
        {value ?? placeholder}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    borderColor: colors.accentMuted,
    backgroundColor: colors.accentMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontWeight: '600',
    fontSize: 11,
  },
  rows: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 2,
  },
  rowHighlight: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  value: {
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  placeholder: {
    fontStyle: 'italic',
    textAlign: 'right',
    flex: 1,
  },
  items: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemsTitle: {
    fontWeight: '600',
  },
  itemsScroll: {
    maxHeight: 140,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemIndex: {
    width: 18,
    alignItems: 'center',
  },
  itemName: {
    flex: 1,
  },
  itemPrices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 72,
    justifyContent: 'flex-end',
  },
  itemTotal: {
    fontWeight: '600',
  },
});
