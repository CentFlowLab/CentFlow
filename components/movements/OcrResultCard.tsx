import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { ReceiptOcrResult } from '@/lib/domain/receipt.types';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';
import { getCategoryLabel } from '@/lib/data/transaction-categories';

type OcrResultCardProps = {
  ocr: ReceiptOcrResult;
};

export function OcrResultCard({ ocr }: OcrResultCardProps) {
  const confidence =
    ocr.confidence !== undefined ? `${Math.round(ocr.confidence * 100)}%` : null;

  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <SymbolView
            name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
            tintColor={colors.accent}
            size={18}
          />
          <Text variant="bodyMedium">Dados detectados pelo OCR</Text>
        </View>
        {confidence ? (
          <View style={styles.badge}>
            <Text variant="caption" color="accent" style={styles.badgeText}>
              {confidence}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.rows}>
        {ocr.merchantName ? (
          <InfoRow label="Loja" value={ocr.merchantName} />
        ) : null}
        {ocr.totalAmount !== undefined ? (
          <InfoRow label="Total" value={formatCurrency(ocr.totalAmount)} />
        ) : null}
        {ocr.date ? <InfoRow label="Data" value={formatDateShort(ocr.date)} /> : null}
        {ocr.suggestedCategory ? (
          <InfoRow
            label="Categoria"
            value={getCategoryLabel(ocr.suggestedCategory, 'expense')}
          />
        ) : null}
      </View>

      {ocr.items && ocr.items.length > 0 ? (
        <View style={styles.items}>
          <Text variant="caption" color="textMuted" style={styles.itemsTitle}>
            Itens detectados ({ocr.items.length})
          </Text>
          {ocr.items.slice(0, 5).map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.itemRow}>
              <Text variant="caption" color="textSecondary" style={styles.itemName}>
                {item.name}
              </Text>
              {item.total !== undefined ? (
                <Text variant="caption" color="textMuted">
                  {formatCurrency(item.total)}
                </Text>
              ) : null}
            </View>
          ))}
          {ocr.items.length > 5 ? (
            <Text variant="caption" color="textMuted">
              +{ocr.items.length - 5} itens
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="caption" color="textSecondary">
        {value}
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
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  badgeText: {
    fontWeight: '600',
  },
  rows: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  items: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemsTitle: {
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemName: {
    flex: 1,
  },
});
