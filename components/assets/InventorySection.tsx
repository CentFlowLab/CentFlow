import { StyleSheet, View } from 'react-native';

import type { InventoryItem } from '@/lib/domain/types';

import { AssetsSectionShell } from './AssetsSectionShell';
import { InventoryListItem } from './InventoryListItem';
import { SwipeableAssetRow } from './SwipeableAssetRow';

type InventorySectionProps = {
  inventory: InventoryItem[];
  onAdd?: () => void;
  onLearnMore?: () => void;
  onDelete?: (item: InventoryItem) => void;
};

export function InventorySection({
  inventory,
  onAdd,
  onLearnMore,
  onDelete,
}: InventorySectionProps) {
  return (
    <AssetsSectionShell
      tab="inventario"
      count={inventory.length}
      onAdd={onAdd}
      onLearnMore={onLearnMore}>
      <View style={styles.list}>
        {inventory.map((item) => (
          <SwipeableAssetRow
            key={item.id}
            label={item.name}
            onDelete={() => onDelete?.(item)}>
            <InventoryListItem item={item} />
          </SwipeableAssetRow>
        ))}
      </View>
    </AssetsSectionShell>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
});
