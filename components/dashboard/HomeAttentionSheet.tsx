import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { AttentionCard } from '@/components/dashboard/AttentionCard';
import { DraggableBottomSheet } from '@/components/layout';
import { Text } from '@/components/ui';
import type { AttentionItem } from '@/lib/domain/types';
import { colors, spacing } from '@/lib/theme';

type HomeAttentionSheetProps = {
  visible: boolean;
  onClose: () => void;
  items: AttentionItem[];
};

export function HomeAttentionSheet({ visible, onClose, items }: HomeAttentionSheetProps) {
  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="90%"
      header={(requestClose) => (
        <View style={styles.header}>
          <View>
            <Text variant="h2">Precisa atenção</Text>
            <Text variant="caption" color="textMuted">
              {items.length > 0
                ? `${items.length} alerta${items.length > 1 ? 's' : ''} activo${items.length > 1 ? 's' : ''}`
                : 'Tudo sob controlo'}
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
      {items.length > 0 ? (
        <View style={styles.list}>
          {items.map((item) => (
            <AttentionCard key={item.id} item={item} />
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <SymbolView
            name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
            tintColor={colors.success}
            size={32}
          />
          <Text variant="bodyMedium" align="center">
            Nada urgente por agora
          </Text>
          <Text variant="caption" color="textSecondary" align="center">
            Garantias, créditos e subscrições estão sob controlo.
          </Text>
        </View>
      )}
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
    gap: spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['2xl'],
  },
});
