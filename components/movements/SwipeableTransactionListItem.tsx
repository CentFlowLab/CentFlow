import { SymbolView } from 'expo-symbols';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { Card, Text } from '@/components/ui';
import { getCategoryById } from '@/lib/data/transaction-categories';
import { resolveTransactionKind } from '@/lib/domain/financial/transaction-kind';
import type { Transaction } from '@/lib/domain/transaction.types';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, formatTransactionDateLabel } from '@/lib/utils/format';

const ACTION_ICON_COLOR = '#FFFFFF';

type SwipeableTransactionListItemProps = {
  transaction: Transaction;
  accountById?: Record<string, string>;
  creditById?: Record<string, string>;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

export function SwipeableTransactionListItem({
  transaction,
  accountById = {},
  creditById = {},
  onEdit,
  onDelete,
}: SwipeableTransactionListItemProps) {
  const kind = resolveTransactionKind(transaction);
  const isTransfer = kind === 'transfer';
  const isCreditPayment = kind === 'credit_card_payment';
  const isCardExpense = kind === 'credit_card_purchase';
  const isCardRefund = kind === 'credit_card_refund';
  const isIncome = kind === 'income';
  const isNonCashMovement = isTransfer || isCreditPayment || isCardRefund;
  const amountColor = isNonCashMovement
    ? colors.primary
    : isIncome
      ? colors.success
      : colors.danger;
  const prefix = isNonCashMovement ? '' : isIncome ? '+' : '−';
  const category = getCategoryById(
    transaction.category,
    isCreditPayment || isCardExpense || isCardRefund ? 'expense' : transaction.type,
  );
  const transferIcon = {
    ios: 'arrow.left.arrow.right',
    android: 'swap_horiz',
    web: 'swap_horiz',
  } as const;
  const paymentIcon = {
    ios: 'creditcard.fill',
    android: 'credit_card',
    web: 'credit_card',
  } as const;
  const icon = isTransfer
    ? transferIcon
    : isCreditPayment
      ? paymentIcon
      : category?.icon ?? {
          ios: 'ellipsis.circle.fill',
          android: 'more_horiz',
          web: 'more_horiz',
        };

  const fromName = transaction.accountId ? accountById[transaction.accountId] : undefined;
  const toName = transaction.destinationAccountId
    ? accountById[transaction.destinationAccountId]
    : undefined;
  const cardName = transaction.creditId ? creditById[transaction.creditId] : undefined;

  const title = isTransfer
    ? fromName && toName
      ? `${fromName} → ${toName}`
      : transaction.description?.trim() || 'Transferência entre contas'
    : isCreditPayment
      ? cardName && fromName
        ? `${fromName} → ${cardName}`
        : transaction.description?.trim() || 'Pagamento de cartão'
      : isCardRefund && cardName
        ? `${transaction.description?.trim() || 'Reembolso'} · ${cardName}`
      : isCardExpense && cardName
        ? `${transaction.description?.trim() || transaction.categoryLabel} · ${cardName}`
        : transaction.description?.trim() || transaction.categoryLabel;

  const categoryLine = isTransfer
    ? 'Transferência'
    : isCreditPayment
      ? 'Pagamento cartão'
      : isCardRefund
        ? 'Reembolso cartão'
        : isCardExpense
          ? cardName
            ? `${transaction.categoryLabel} · ${cardName}`
            : transaction.categoryLabel
          : fromName
            ? `${transaction.categoryLabel} · ${fromName}`
            : transaction.categoryLabel;

  const dateLine = formatTransactionDateLabel(transaction.date);
  const badgeLabel = isTransfer
    ? 'Transferência'
    : isCreditPayment
      ? 'Pagamento cartão'
      : isCardExpense
        ? 'Cartão'
        : transaction.recurringId
          ? 'Recorrente'
          : null;

  function confirmDelete() {
    const message = `Tens a certeza que queres eliminar "${title}"? Esta ação não pode ser desfeita.`;

    if (Platform.OS === 'web') {
      if (typeof globalThis.confirm === 'function' && globalThis.confirm(message)) {
        onDelete(transaction);
      }
      return;
    }

    Alert.alert('Eliminar movimento', message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => onDelete(transaction),
      },
    ]);
  }

  function renderRightActions() {
    return (
      <View style={styles.actions}>
        {!isTransfer && !isCreditPayment ? (
          <Pressable
            onPress={() => onEdit(transaction)}
            style={({ pressed }) => [
              styles.actionButton,
              styles.editAction,
              pressed && styles.actionPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Editar movimento">
            <SymbolView
              name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
              tintColor={ACTION_ICON_COLOR}
              size={22}
            />
          </Pressable>
        ) : null}

        <Pressable
          onPress={confirmDelete}
          style={({ pressed }) => [
            styles.actionButton,
            styles.deleteAction,
            pressed && styles.actionPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Eliminar movimento">
          <SymbolView
            name={{ ios: 'trash.fill', android: 'delete', web: 'delete' }}
            tintColor={ACTION_ICON_COLOR}
            size={22}
          />
        </Pressable>
      </View>
    );
  }

  const row = (
    <Pressable
      onPress={() => {
        if (!isTransfer && !isCreditPayment) onEdit(transaction);
      }}
      onLongPress={() => {
        if (!isTransfer && !isCreditPayment) onEdit(transaction);
      }}
      delayLongPress={320}
      style={({ pressed }) => [pressed && !isTransfer && !isCreditPayment && styles.rowPressed]}>
      <Card variant="elevated" style={[styles.card, isNonCashMovement && styles.cardTransfer]}>
        <View
          style={[
            styles.iconWrapper,
            isNonCashMovement
              ? styles.iconTransfer
              : isIncome
                ? styles.iconIncome
                : styles.iconExpense,
          ]}>
          <SymbolView name={icon} tintColor={amountColor} size={20} />
        </View>

        <View style={styles.content}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {categoryLine}
            {hasReceipt(transaction) ? ' · Talão' : ''}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {dateLine}
          </Text>
        </View>

        <View style={styles.trailing}>
          {badgeLabel ? (
            <View style={styles.transferBadge}>
              <Text variant="caption" color="primary" style={styles.badgeText}>
                {badgeLabel}
              </Text>
            </View>
          ) : hasReceipt(transaction) ? (
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
        </View>
      </Card>
    </Pressable>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrapper}>
        {row}
        <View style={styles.webActions}>
          {!isTransfer && !isCreditPayment ? (
            <Pressable
              onPress={() => onEdit(transaction)}
              style={[styles.webActionBtn, styles.editAction]}
              accessibilityLabel="Editar movimento">
              <Text variant="caption" style={styles.webActionText}>
                Editar
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={confirmDelete}
            style={[styles.webActionBtn, styles.deleteAction]}
            accessibilityLabel="Eliminar movimento">
            <Text variant="caption" style={styles.webActionText}>
              Eliminar
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      containerStyle={styles.wrapper}>
      {row}
    </Swipeable>
  );
}

function hasReceipt(transaction: Transaction): boolean {
  return Boolean(transaction.receiptId || transaction.receiptImage || transaction.receiptUrl);
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  rowPressed: {
    opacity: 0.92,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  cardTransfer: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconIncome: {
    backgroundColor: colors.successMuted,
  },
  iconExpense: {
    backgroundColor: colors.dangerMuted,
  },
  iconTransfer: {
    backgroundColor: colors.primaryMuted,
  },
  content: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  trailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.xs,
    minWidth: 88,
  },
  transferBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryMuted,
  },
  badgeText: {
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionButton: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
    borderRadius: radius.md,
    alignSelf: 'stretch',
  },
  actionPressed: {
    opacity: 0.85,
  },
  editAction: {
    backgroundColor: colors.primaryDark,
  },
  deleteAction: {
    backgroundColor: colors.danger,
  },
  webActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  webActionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  webActionText: {
    color: ACTION_ICON_COLOR,
    fontWeight: '600',
  },
});
