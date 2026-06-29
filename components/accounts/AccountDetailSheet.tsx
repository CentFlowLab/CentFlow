import { StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Text } from '@/components/ui';
import type { AccountWithBalance } from '@/lib/domain/account.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

type AccountDetailSheetProps = {
  visible: boolean;
  account: AccountWithBalance | null;
  transactions: Transaction[];
  onClose: () => void;
};

export function AccountDetailSheet({
  visible,
  account,
  transactions,
  onClose,
}: AccountDetailSheetProps) {
  if (!account) return null;

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="82%"
      header={() => (
        <View style={styles.header}>
          <Text variant="h2">{account.name}</Text>
          <Text variant="h3" color="primary">
            {formatCurrency(account.balance)}
          </Text>
        </View>
      )}>
      <Text variant="label" color="textMuted" style={styles.section}>
        Movimentos desta conta
      </Text>

      {transactions.length === 0 ? (
        <Text variant="bodyMedium" color="textMuted">
          Ainda não há movimentos associados a esta conta.
        </Text>
      ) : (
        transactions.map((tx) => (
          <View key={tx.id} style={styles.row}>
            <View style={styles.rowText}>
              <Text variant="bodyMedium">{tx.description ?? tx.categoryLabel}</Text>
              <Text variant="caption" color="textMuted">
                {formatDateShort(tx.date)}
              </Text>
            </View>
            <Text
              variant="bodyMedium"
              style={{ color: tx.type === 'income' ? colors.success : colors.danger }}>
              {tx.type === 'income' ? '+' : '−'}
              {formatCurrency(tx.amount)}
            </Text>
          </View>
        ))
      )}
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.md,
  },
});
