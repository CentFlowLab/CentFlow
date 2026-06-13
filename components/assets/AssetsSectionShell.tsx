import { StyleSheet, View } from 'react-native';

import { SectionHeader } from '@/components/ui';
import type { AssetsTab } from '@/lib/domain/assets.types';
import { spacing } from '@/lib/theme';

import { ASSETS_EMPTY_CONFIG, ASSETS_SECTION_META } from './assets.config';
import { AssetsEmptyState } from './AssetsEmptyState';

type AssetsSectionShellProps = {
  tab: AssetsTab;
  count: number;
  onAdd?: () => void;
  onLearnMore?: () => void;
  children?: React.ReactNode;
};

export function AssetsSectionShell({
  tab,
  count,
  onAdd,
  onLearnMore,
  children,
}: AssetsSectionShellProps) {
  const meta = ASSETS_SECTION_META[tab];
  const emptyConfig = ASSETS_EMPTY_CONFIG[tab];
  const isEmpty = count === 0;

  return (
    <View style={styles.container}>
      <SectionHeader
        title={meta.title}
        subtitle={
          count > 0
            ? `${count} ${count === 1 ? 'registo' : 'registos'}`
            : meta.subtitle
        }
        actionLabel={count > 0 ? meta.addLabel : undefined}
        onAction={count > 0 ? onAdd : undefined}
      />

      {isEmpty ? (
        <AssetsEmptyState
          config={emptyConfig}
          onPrimaryAction={onAdd}
          onSecondaryAction={onLearnMore}
        />
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 360,
  },
});
