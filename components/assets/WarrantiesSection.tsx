import { StyleSheet, View } from 'react-native';

import type { Warranty } from '@/lib/domain/assets.types';

import { AssetsSectionShell } from './AssetsSectionShell';
import { SwipeableAssetRow } from './SwipeableAssetRow';
import { WarrantyListItem } from './WarrantyListItem';

type WarrantiesSectionProps = {
  warranties: Warranty[];
  onAdd?: () => void;
  onLearnMore?: () => void;
  onDelete?: (warranty: Warranty) => void;
};

export function WarrantiesSection({
  warranties,
  onAdd,
  onLearnMore,
  onDelete,
}: WarrantiesSectionProps) {
  return (
    <AssetsSectionShell
      tab="garantias"
      count={warranties.length}
      onAdd={onAdd}
      onLearnMore={onLearnMore}>
      <View style={styles.list}>
        {warranties.map((warranty) => (
          <SwipeableAssetRow
            key={warranty.id}
            label={warranty.product}
            onDelete={() => onDelete?.(warranty)}>
            <WarrantyListItem warranty={warranty} />
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
