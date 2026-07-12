import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { getCategoryById } from '@/lib/data/transaction-categories';
import type { Transaction } from '@/lib/domain/transaction.types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

type TransactionListItemProps = {
  transaction: Transaction;
};

export function TransactionListItem({ transaction }: TransactionListItemProps) {
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.success : colors.danger;
  const prefix = isIncome ? '+' : '−';
  const category = getCategoryById(transaction.category, transaction.type);
  const icon = category?.icon ?? {
    ios: 'ellipsis.circle.fill',
    android: 'more_horiz',
    web: 'more_horiz',
  };
  const title = transaction.description?.trim() || transaction.categoryLabel;
  const hasReceipt = Boolean(transaction.receiptId || transaction.receiptImage || transaction.receiptUrl);
  const isOpenBanking = transaction.source === 'open_banking';
  const originSuffix = isOpenBanking ? ' · Banco' : hasReceipt ? ' · Talão' : '';

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={[styles.iconWrapper, isIncome ? styles.iconIncome : styles.iconExpense]}>
        <SymbolView name={icon} tintColor={amountColor} size={20} />
      </View>

      <View style={styles.content}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {transaction.categoryLabel} · {formatDateShort(transaction.date)}
          {originSuffix}
        </Text>
      </View>

      {hasReceipt ? (
        <SymbolView
          name={{ ios: 'doc.text.fill', android: 'receipt', web: 'receipt' }}
          tintColor={colors.textMuted}
          size={16}
        />
      ) : null}

      <Text variant="bodyMedium" style={{ color: amountColor }}>
        {prefix}
        {formatCurrency(transaction.amount, transaction.currency)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconIncome: {
    backgroundColor: colors.successMuted,
  },
  iconExpense: {
    backgroundColor: colors.dangerMuted,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
});
