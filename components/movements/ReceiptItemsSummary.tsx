import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { ReceiptConfirmedItem } from '@/lib/domain/receipt.types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type ReceiptItemsSummaryProps = {
  items: ReceiptConfirmedItem[];
  compact?: boolean;
};

export function ReceiptItemsSummary({ items, compact = false }: ReceiptItemsSummaryProps) {
  if (items.length === 0) return null;

  const total = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.header}>
        <Text variant="bodyMedium" style={styles.title}>
          Itens do talão
        </Text>
        <Text variant="caption" color="textMuted">
          {items.length} linha{items.length === 1 ? '' : 's'}
        </Text>
      </View>

      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.nameCol}>
              <Text variant="body" color="textSecondary" numberOfLines={compact ? 1 : 2}>
                {item.name}
              </Text>
              {item.quantity ? (
                <Text variant="caption" color="textMuted">
                  Qtd. {item.quantity}
                  {item.unitPrice ? ` · ${formatCurrency(item.unitPrice)}` : ''}
                </Text>
              ) : null}
            </View>
            <Text variant="bodyMedium">{formatCurrency(item.totalPrice)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalRow}>
        <Text variant="caption" color="textMuted">
          Total dos itens
        </Text>
        <Text variant="bodyMedium" color="primary">
          {formatCurrency(total)}
        </Text>
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    fontWeight: '600',
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  nameCol: {
    flex: 1,
    gap: 2,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
