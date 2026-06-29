import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout/DraggableBottomSheet';
import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

export type QuickAddActionId =
  | 'quick_expense'
  | 'movement'
  | 'receipt'
  | 'subscription'
  | 'product'
  | 'goal'
  | 'credit'
  | 'asset'
  | 'warranty';

type QuickAddItem = {
  id: QuickAddActionId;
  label: string;
  description: string;
  icon: SymbolViewProps['name'];
  color: string;
  bg: string;
};

const ALL_ITEMS: QuickAddItem[] = [
  {
    id: 'quick_expense',
    label: 'Despesa rápida',
    description: 'Regista um gasto em segundos',
    icon: { ios: 'bolt.fill', android: 'flash_on', web: 'flash_on' },
    color: colors.warning,
    bg: 'rgba(251, 191, 36, 0.12)',
  },
  {
    id: 'movement',
    label: 'Novo movimento',
    description: 'Regista uma despesa ou receita',
    icon: { ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' },
    color: colors.primary,
    bg: colors.primaryMuted,
  },
  {
    id: 'receipt',
    label: 'Digitalizar talão',
    description: 'OCR preenche o movimento automaticamente',
    icon: { ios: 'doc.viewfinder', android: 'document_scanner', web: 'document_scanner' },
    color: colors.primary,
    bg: colors.primaryMuted,
  },
  {
    id: 'credit',
    label: 'Novo crédito',
    description: 'Regista prestações e custos fixos',
    icon: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
    color: colors.accent,
    bg: colors.accentMuted,
  },
  {
    id: 'subscription',
    label: 'Nova subscrição',
    description: 'Controla custos recorrentes',
    icon: { ios: 'repeat.circle.fill', android: 'autorenew', web: 'autorenew' },
    color: colors.accent,
    bg: colors.accentMuted,
  },
  {
    id: 'goal',
    label: 'Novo objetivo',
    description: 'Define uma meta de poupança',
    icon: { ios: 'target', android: 'flag', web: 'flag' },
    color: colors.warning,
    bg: 'rgba(251, 191, 36, 0.12)',
  },
  {
    id: 'asset',
    label: 'Novo ativo',
    description: 'Regista um bem no inventário',
    icon: { ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' },
    color: colors.success,
    bg: colors.successMuted,
  },
  {
    id: 'warranty',
    label: 'Nova garantia',
    description: 'Guarda garantias com alertas',
    icon: { ios: 'shield.fill', android: 'verified_user', web: 'verified_user' },
    color: colors.primary,
    bg: colors.primaryMuted,
  },
  {
    id: 'product',
    label: 'Produto',
    description: 'Monitoriza preços e poupanças',
    icon: { ios: 'tag.fill', android: 'sell', web: 'sell' },
    color: colors.success,
    bg: colors.successMuted,
  },
];

type QuickAddMenuSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: QuickAddActionId) => void;
  /** Filtra acções — só mostra opções relevantes ao ecrã actual. */
  actions?: QuickAddActionId[];
};

export function QuickAddMenuSheet({
  visible,
  onClose,
  onSelect,
  actions,
}: QuickAddMenuSheetProps) {
  const pendingActionRef = useRef<QuickAddActionId | null>(null);

  const items = actions?.length
    ? ALL_ITEMS.filter((item) => actions.includes(item.id))
    : ALL_ITEMS;

  const handleDismissed = useCallback(() => {
    const action = pendingActionRef.current;
    if (!action) return;
    pendingActionRef.current = null;
    onSelect(action);
  }, [onSelect]);

  function handleSelect(action: QuickAddActionId) {
    pendingActionRef.current = action;
    onClose();
  }

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      onDismissed={handleDismissed}
      maxHeight="72%"
      header={(requestClose) => (
        <View style={styles.header}>
          <View>
            <Text variant="h2">Adicionar</Text>
            <Text variant="caption" color="textMuted">
              {items.length === 1 ? items[0]?.label : 'Escolhe o que queres registar'}
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
