import { SymbolView } from 'expo-symbols';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { Card, Text } from '@/components/ui';
import { getCategoryById } from '@/lib/data/transaction-categories';
import type { Transaction } from '@/lib/domain/transaction.types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

type SwipeableTransactionListItemProps = {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

export function SwipeableTransactionListItem({
  transaction,
  onEdit,
  onDelete,
}: SwipeableTransactionListItemProps) {
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
  const hasReceipt = Boolean(
    transaction.receiptId || transaction.receiptImage || transaction.receiptUrl,
  );

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
        <Pressable
          onPress={() => onEdit(transaction)}
          style={[styles.actionButton, styles.editAction]}
          accessibilityRole="button"
          accessibilityLabel="Editar movimento">
          <SymbolView
            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
            tintColor={colors.textInverse}
            size={20}
          />
          <Text variant="caption" style={styles.actionLabel}>
            Editar
          </Text>
        </Pressable>

        <Pressable
          onPress={confirmDelete}
          style={[styles.actionButton, styles.deleteAction]}
          accessibilityRole="button"
          accessibilityLabel="Eliminar movimento">
          <SymbolView
            name={{ ios: 'trash.fill', android: 'delete', web: 'delete' }}
            tintColor={colors.textInverse}
            size={20}
          />
          <Text variant="caption" style={styles.actionLabel}>
            Eliminar
          </Text>
        </Pressable>
      </View>
    );
  }

  const row = (
    <Pressable
      onPress={() => onEdit(transaction)}
      onLongPress={() => onEdit(transaction)}
      delayLongPress={320}
      style={({ pressed }) => [pressed && styles.rowPressed]}>
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
          {hasReceipt ? ' · Talão' : ''}
        </Text>
      </View>

      <Pressable
        onPress={() => onEdit(transaction)}
        hitSlop={10}
        style={styles.editButton}
        accessibilityRole="button"
        accessibilityLabel="Editar movimento">
        <SymbolView
          name={{ ios: 'square.and.pencil', android: 'edit', web: 'edit' }}
          tintColor={colors.textMuted}
          size={18}
        />
      </Pressable>

      {Platform.OS === 'web' ? (
        <Pressable
          onPress={confirmDelete}
          hitSlop={10}
          style={styles.editButton}
          accessibilityRole="button"
          accessibilityLabel="Eliminar movimento">
          <SymbolView
            name={{ ios: 'trash', android: 'delete', web: 'delete' }}
            tintColor={colors.danger}
            size={18}
          />
        </Pressable>
      ) : null}

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
    </Pressable>
  );

  if (Platform.OS === 'web') {
    return <View style={styles.wrapper}>{row}</View>;
  }

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      containerStyle={styles.wrapper}>
      {row}
    </Swipeable>
  );
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
  editButton: {
    padding: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: spacing.md,
  },
  actionButton: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  editAction: {
    backgroundColor: colors.primaryDark,
  },
  deleteAction: {
    backgroundColor: colors.danger,
  },
  actionLabel: {
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: 11,
  },
});
