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
  creditos: 'credits',
  subscricoes: 'subscriptions',
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
  {
    key: 'creditos',
    label: 'Créditos',
    icon: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
    color: colors.warning,
    bg: 'rgba(251, 191, 36, 0.12)',
  },
  {
    key: 'subscricoes',
    label: 'Subscrições',
    icon: { ios: 'repeat.circle.fill', android: 'autorenew', web: 'autorenew' },
    color: colors.danger,
    bg: colors.dangerMuted,
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
              style={[
                styles.tile,
                { backgroundColor: item.bg },
                isActive && styles.tileActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${count} registados`}
              accessibilityState={{ selected: isActive }}>
              <SymbolView name={item.icon} tintColor={item.color} size={13} />
              <Text variant="bodyMedium" style={[styles.count, { color: item.color }]}>
                {count}
              </Text>
              <Text
                variant="caption"
                color="textMuted"
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={styles.label}>
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
    gap: spacing.xs,
  },
  tile: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileActive: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  count: {
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 18,
  },
  label: {
    textAlign: 'center',
    fontSize: 9,
    lineHeight: 11,
  },
});
