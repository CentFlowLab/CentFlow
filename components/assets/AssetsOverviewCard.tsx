import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { AssetsCounts, AssetsTab } from '@/lib/domain/assets.types';
import { colors, radius, spacing } from '@/lib/theme';

type AssetsOverviewCardProps = {
  counts: AssetsCounts;
  activeTab?: AssetsTab;
  onTabPress?: (tab: AssetsTab) => void;
};

const TAB_COUNT_KEY: Record<AssetsTab, keyof AssetsCounts> = {
  objetivos: 'goals',
  garantias: 'warranties',
  inventario: 'inventory',
};

const OVERVIEW_ITEMS: Array<{
  key: AssetsTab;
  label: string;
  icon: SymbolViewProps['name'];
  color: string;
  bg: string;
}> = [
  {
    key: 'objetivos',
    label: 'Objetivos',
    icon: { ios: 'target', android: 'flag', web: 'flag' },
    color: colors.primary,
    bg: colors.primaryMuted,
  },
  {
    key: 'garantias',
    label: 'Garantias',
    icon: { ios: 'shield.fill', android: 'verified_user', web: 'verified_user' },
    color: colors.accent,
    bg: colors.accentMuted,
  },
  {
    key: 'inventario',
    label: 'Inventário',
    icon: { ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' },
    color: colors.success,
    bg: colors.successMuted,
  },
];

export function AssetsOverviewCard({
  counts,
  activeTab,
  onTabPress,
}: AssetsOverviewCardProps) {
  return (
    <Card variant="elevated" style={styles.card}>
      <Text variant="label" color="textMuted">
        Resumo dos ativos
      </Text>

      <View style={styles.grid}>
        {OVERVIEW_ITEMS.map((item) => {
          const count = counts[TAB_COUNT_KEY[item.key]];
          const isActive = activeTab === item.key;

          return (
            <Pressable
              key={item.key}
              onPress={() => onTabPress?.(item.key)}
              style={[styles.item, isActive && styles.itemActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}>
              <View style={[styles.iconWrap, { backgroundColor: item.bg }]}>
                <SymbolView name={item.icon} tintColor={item.color} size={20} />
              </View>
              <Text variant="caption" color={isActive ? 'primary' : 'textSecondary'}>
                {item.label}
              </Text>
              <Text variant="label" color={isActive ? 'primary' : 'textMuted'}>
                {count}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
