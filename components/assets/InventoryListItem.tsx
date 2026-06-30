import { memo } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { InventoryItem } from '@/lib/domain/types';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type InventoryListItemProps = {
  item: InventoryItem;
  onPress?: (item: InventoryItem) => void;
};

export const InventoryListItem = memo(function InventoryListItem({
  item,
  onPress,
}: InventoryListItemProps) {
  return (
    <Pressable
      onPress={() => onPress?.(item)}
      disabled={!onPress}
      style={({ pressed }) => [pressed && onPress && styles.pressed]}>
      <Card variant="elevated" style={styles.card}>
      <View style={styles.icon}>
        <SymbolView
          name={{ ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' }}
          tintColor={colors.success}
          size={18}
        />
      </View>

      <View style={styles.content}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {item.name}
        </Text>
        {item.sourceWarrantyId ? (
          <Text variant="caption" color="warning">
            Garantia expirada
            {item.warrantyExpiredAt ? ` · ${item.warrantyExpiredAt}` : ''}
          </Text>
        ) : item.category ? (
          <Text variant="caption" color="textMuted">
            {item.category}
          </Text>
        ) : null}
      </View>

      <Text variant="bodyMedium">{formatCurrency(item.value)}</Text>
    </Card>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.92,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.successMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
});
