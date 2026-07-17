import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, SectionHeader, Text } from '@/components/ui';
import { resolveTransactionKind } from '@/lib/domain/financial/transaction-kind';
import {
  getDisplayCategoryLabel,
  resolveMovementSourceName,
} from '@/lib/domain/transaction-display';
import type { Transaction } from '@/lib/domain/transaction.types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

type HomeRecentMovementsCardProps = {
  transactions: Transaction[];
};

export function HomeRecentMovementsCard({ transactions }: HomeRecentMovementsCardProps) {
  const items = transactions.slice(0, 5);
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <SectionHeader title="Movimentos recentes" />
        <Pressable
          onPress={() => router.push('/(tabs)/movimentos')}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel="Ver todos os movimentos">
          <Text variant="caption" color="primary">
            Ver todos
          </Text>
        </Pressable>
      </View>
      <Card variant="outlined" padding="sm">
        {items.map((tx, index) => {
          const kind = resolveTransactionKind(tx);
          const isIncome = kind === 'income';
          const isNeutral =
            kind === 'transfer' ||
            kind === 'credit_card_payment' ||
            kind === 'credit_card_refund';
          const tone = isNeutral ? 'text' : isIncome ? 'success' : 'danger';
          const prefix = isNeutral ? '' : isIncome ? '+' : '−';
          const title = tx.merchant || tx.description || getDisplayCategoryLabel(tx);
          const source = resolveMovementSourceName(tx, {}, {});

          return (
            <View
              key={tx.id}
              style={[styles.row, index < items.length - 1 && styles.rowBorder]}
              accessibilityLabel={`${title}, ${prefix}${formatCurrency(tx.amount)}`}>
              <View style={styles.meta}>
                <Text variant="bodyMedium" numberOfLines={1}>
                  {title}
                </Text>
                <Text variant="caption" color="textMuted" numberOfLines={1}>
                  {[getDisplayCategoryLabel(tx), source, formatDateShort(tx.date)]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Text variant="bodyMedium" color={tone} style={styles.amount}>
                {prefix}
                {formatCurrency(tx.amount)}
              </Text>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  meta: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  amount: {
    flexShrink: 0,
  },
});
