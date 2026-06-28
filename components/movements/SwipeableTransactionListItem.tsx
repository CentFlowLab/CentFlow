import { SymbolView } from 'expo-symbols';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { Card, Text } from '@/components/ui';
import { getCategoryById } from '@/lib/data/transaction-categories';
import type { Transaction } from '@/lib/domain/transaction.types';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

const ACTION_ICON_COLOR = '#FFFFFF';

type SwipeableTransactionListItemProps = {
  transaction: Transaction;
  merchantGroupName?: string;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

export function SwipeableTransactionListItem({
  transaction,
  merchantGroupName,
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
            {merchantGroupName ? ` · grupo: ${merchantGroupName}` : ''}
            {hasReceipt ? ' · Talão' : ''}
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
    </Pressable>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrapper}>
        {row}
        <View style={styles.webActions}>
          <Pressable
            onPress={() => onEdit(transaction)}
            style={[styles.webActionBtn, styles.editAction]}
            accessibilityLabel="Editar movimento">
            <Text variant="caption" style={styles.webActionText}>
              Editar
            </Text>
          </Pressable>
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
    minHeight: 72,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
    marginBottom: spacing.md,
    height: 72,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAction: {
    backgroundColor: colors.primary,
  },
  deleteAction: {
    backgroundColor: colors.danger,
  },
  actionPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  webActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
