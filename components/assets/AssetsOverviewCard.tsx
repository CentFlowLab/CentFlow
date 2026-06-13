import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { AssetsCounts, AssetsTab } from '@/lib/domain/assets.types';
import { colors, radius, spacing } from '@/lib/theme';

type AssetsOverviewCardProps = {
  counts: AssetsCounts;
  activeTab: AssetsTab;
  onSelectTab: (tab: AssetsTab) => void;
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
  onSelectTab,
}: AssetsOverviewCardProps) {
  return (
    <Card variant="elevated" style={styles.card}>
      <Text variant="label" color="textMuted">
        Resumo dos ativos
      </Text>

      <View style={styles.grid}>
        {OVERVIEW_ITEMS.map((item) => {
          const count =
            item.key === 'objetivos'
              ? counts.goals
              : item.key === 'garantias'
                ? counts.warranties
                : counts.inventory;
          const isActive = activeTab === item.key;

          return (
            <Pressable
              key={item.key}
              onPress={() => onSelectTab(item.key)}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: item.bg, borderColor: isActive ? item.color : 'transparent' },
                pressed && styles.tilePressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${count} registados`}
              accessibilityState={{ selected: isActive }}>
              <SymbolView name={item.icon} tintColor={item.color} size={18} />
              <Text variant="h3" style={{ color: item.color }}>
                {count}
              </Text>
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {item.label}
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
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  tilePressed: {
    opacity: 0.88,
  },
});
