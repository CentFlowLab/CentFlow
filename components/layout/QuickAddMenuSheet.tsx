import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout/DraggableBottomSheet';
import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

export type QuickAddActionId = 'movement' | 'subscription' | 'product' | 'goal';

type QuickAddItem = {
  id: QuickAddActionId;
  label: string;
  description: string;
  icon: SymbolViewProps['name'];
  color: string;
  bg: string;
};

const ITEMS: QuickAddItem[] = [
  {
    id: 'movement',
    label: 'Movimento',
    description: 'Regista uma despesa ou receita',
    icon: { ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' },
    color: colors.primary,
    bg: colors.primaryMuted,
  },
  {
    id: 'subscription',
    label: 'Subscrição',
    description: 'Controla custos recorrentes',
    icon: { ios: 'repeat.circle.fill', android: 'autorenew', web: 'autorenew' },
    color: colors.accent,
    bg: colors.accentMuted,
  },
  {
    id: 'product',
    label: 'Produto',
    description: 'Monitoriza preços e poupanças',
    icon: { ios: 'tag.fill', android: 'sell', web: 'sell' },
    color: colors.success,
    bg: colors.successMuted,
  },
  {
    id: 'goal',
    label: 'Objetivo',
    description: 'Define uma meta de poupança',
    icon: { ios: 'target', android: 'flag', web: 'flag' },
    color: colors.warning,
    bg: 'rgba(251, 191, 36, 0.12)',
  },
];

type QuickAddMenuSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: QuickAddActionId) => void;
};

export function QuickAddMenuSheet({ visible, onClose, onSelect }: QuickAddMenuSheetProps) {
  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="72%"
      header={(requestClose) => (
        <View style={styles.header}>
          <View>
            <Text variant="h2">Adicionar</Text>
            <Text variant="caption" color="textMuted">
              Escolhe o que queres registar
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
        {ITEMS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              onClose();
              requestAnimationFrame(() => onSelect(item.id));
            }}
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
