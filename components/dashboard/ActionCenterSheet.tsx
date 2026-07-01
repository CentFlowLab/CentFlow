import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Text } from '@/components/ui';
import type { AssistantActionId } from '@/lib/domain/financial';
import { colors, radius, spacing } from '@/lib/theme';

type ActionItem = {
  id: AssistantActionId;
  label: string;
  description: string;
  icon: SymbolViewProps['name'];
};

const ACTIONS: ActionItem[] = [
  {
    id: 'add_expense',
    label: 'Adicionar despesa',
    description: 'Regista um movimento manualmente',
    icon: { ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' },
  },
  {
    id: 'scan_receipt',
    label: 'Digitalizar compra',
    description: 'OCR lê o talão e cria movimento',
    icon: { ios: 'doc.viewfinder', android: 'document_scanner', web: 'document_scanner' },
  },
  {
    id: 'create_goal',
    label: 'Criar objetivo',
    description: 'Define uma meta de poupança',
    icon: { ios: 'target', android: 'flag', web: 'flag' },
  },
  {
    id: 'add_subscription',
    label: 'Adicionar despesa recorrente',
    description: 'Controla custos recorrentes',
    icon: { ios: 'repeat.circle.fill', android: 'autorenew', web: 'autorenew' },
  },
  {
    id: 'review_subscriptions',
    label: 'Rever subscrições',
    description: 'Optimiza renovações e custos',
    icon: { ios: 'list.bullet.rectangle', android: 'list', web: 'list' },
  },
];

type ActionCenterSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (actionId: AssistantActionId) => void;
};

export function ActionCenterSheet({ visible, onClose, onSelect }: ActionCenterSheetProps) {
  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="78%"
      header={() => (
        <View style={styles.header}>
          <Text variant="h2">Centro de acções</Text>
          <Text variant="caption" color="textMuted">
            O que posso fazer hoje?
          </Text>
        </View>
      )}>
      <View style={styles.list}>
        {ACTIONS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              onSelect(item.id);
              onClose();
            }}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
            <View style={styles.iconWrap}>
              <SymbolView name={item.icon} tintColor={colors.primary} size={22} />
            </View>
            <View style={styles.text}>
              <Text variant="bodyMedium">{item.label}</Text>
              <Text variant="caption" color="textSecondary">
                {item.description}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
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
    backgroundColor: colors.primaryMuted,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
