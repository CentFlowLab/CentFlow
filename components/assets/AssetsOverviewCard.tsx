import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { AssetsCounts } from '@/lib/domain/assets.types';
import { colors, radius, spacing } from '@/lib/theme';

type AssetsOverviewCardProps = {
  counts: AssetsCounts;
};

const OVERVIEW_ITEMS: Array<{
  key: keyof AssetsCounts;
  label: string;
  icon: SymbolViewProps['name'];
  color: string;
  bg: string;
}> = [
  {
    key: 'goals',
    label: 'Objetivos',
    icon: { ios: 'target', android: 'flag', web: 'flag' },
    color: colors.primary,
    bg: colors.primaryMuted,
  },
  {
    key: 'warranties',
    label: 'Garantias',
    icon: { ios: 'shield.fill', android: 'verified_user', web: 'verified_user' },
    color: colors.accent,
    bg: colors.accentMuted,
  },
  {
    key: 'inventory',
    label: 'Inventário',
    icon: { ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' },
    color: colors.success,
    bg: colors.successMuted,
  },
];

export function AssetsOverviewCard({ counts }: AssetsOverviewCardProps) {
  return (
    <Card variant="elevated" style={styles.card}>
      <Text variant="label" color="textMuted">
        Resumo dos ativos
      </Text>

      <View style={styles.grid}>
        {OVERVIEW_ITEMS.map((item) => {
          const count = counts[item.key];

          return (
            <View
              key={item.key}
              style={[styles.tile, { backgroundColor: item.bg }]}
              accessibilityLabel={`${item.label}, ${count} registados`}>
              <SymbolView name={item.icon} tintColor={item.color} size={18} />
              <Text variant="h3" style={{ color: item.color }}>
                {count}
              </Text>
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {item.label}
              </Text>
            </View>
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
    borderWidth: 1,
    borderColor: colors.border,
  },
});
