import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout/DraggableBottomSheet';
import { Text } from '@/components/ui';
import { resolveTransactionKind } from '@/lib/domain/financial/transaction-kind';
import type { Transaction } from '@/lib/domain/transaction.types';
import { colors, radius, spacing } from '@/lib/theme';

export type TransactionContextAction = 'edit' | 'duplicate' | 'changeCategory' | 'markRecurring';

type MenuItem = {
  id: TransactionContextAction;
  label: string;
  description: string;
  icon: SymbolViewProps['name'];
  color: string;
  bg: string;
};

const BASE_ITEMS: MenuItem[] = [
  {
    id: 'edit',
    label: 'Editar',
    description: 'Abrir formulário completo',
    icon: { ios: 'pencil', android: 'edit', web: 'edit' },
    color: colors.primary,
    bg: colors.primaryMuted,
  },
  {
    id: 'duplicate',
    label: 'Duplicar movimento',
    description: 'Copiar campos com data de hoje',
    icon: { ios: 'doc.on.doc.fill', android: 'content_copy', web: 'content_copy' },
    color: colors.accent,
    bg: colors.accentMuted,
  },
  {
    id: 'changeCategory',
    label: 'Mudar categoria',
    description: 'Seletor rápido sem editar tudo',
    icon: { ios: 'tag.fill', android: 'label', web: 'label' },
    color: colors.warning,
    bg: 'rgba(251, 191, 36, 0.12)',
  },
  {
    id: 'markRecurring',
    label: 'Marcar como recorrente',
    description: 'Criar despesa recorrente a partir deste movimento',
    icon: { ios: 'repeat.circle.fill', android: 'autorenew', web: 'autorenew' },
    color: colors.success,
    bg: colors.successMuted,
  },
];

type TransactionContextMenuSheetProps = {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSelect: (action: TransactionContextAction, transaction: Transaction) => void;
};

function getMenuItems(transaction: Transaction | null): MenuItem[] {
  if (!transaction) return [];

  const kind = resolveTransactionKind(transaction);
  const isExpense =
    kind === 'expense' ||
    kind === 'credit_card_purchase';

  return BASE_ITEMS.filter((item) => {
    if (item.id === 'markRecurring') return isExpense;
    return true;
  });
}

export function TransactionContextMenuSheet({
  visible,
  transaction,
  onClose,
  onSelect,
}: TransactionContextMenuSheetProps) {
  const pendingRef = useRef<TransactionContextAction | null>(null);
  const items = getMenuItems(transaction);

  const handleDismissed = useCallback(() => {
    const action = pendingRef.current;
    pendingRef.current = null;
    if (!action || !transaction) return;
    onSelect(action, transaction);
  }, [onSelect, transaction]);

  function handleSelect(action: TransactionContextAction) {
    pendingRef.current = action;
    onClose();
  }

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      onDismissed={handleDismissed}
      maxHeight="62%"
      header={(requestClose) => (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="h3">Movimento</Text>
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {transaction?.description?.trim() || 'Opções rápidas'}
            </Text>
          </View>
          <Pressable onPress={requestClose} hitSlop={12} accessibilityLabel="Fechar">
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
              tintColor={colors.textMuted}
              size={28}
            />
          </Pressable>
        </View>
      )}>
      <View style={styles.list}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => handleSelect(item.id)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel={item.label}>
            <View style={[styles.iconWrap, { backgroundColor: item.bg }]}>
              <SymbolView name={item.icon} tintColor={item.color} size={22} />
            </View>
            <View style={styles.text}>
              <Text variant="bodyMedium">{item.label}</Text>
              <Text variant="caption" color="textSecondary">
                {item.description}
              </Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={colors.textMuted}
              size={16}
            />
          </Pressable>
        ))}
      </View>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    opacity: 0.88,
    borderColor: colors.primary,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
