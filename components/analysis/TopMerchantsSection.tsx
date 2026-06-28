import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Card, SectionHeader, Text } from '@/components/ui';
import type { MerchantGroupAnalytics } from '@/lib/merchants/group-analytics';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

type TopMerchantsSectionProps = {
  merchants: MerchantGroupAnalytics[];
};

function formatChangePercent(value: number | null): string {
  if (value == null) return '—';
  const arrow = value >= 0 ? '↑' : '↓';
  return `${arrow}${Math.abs(Math.round(value))}% vs mês passado`;
}

export function TopMerchantsSection({ merchants }: TopMerchantsSectionProps) {
  if (merchants.length === 0) return null;

  const top = merchants.slice(0, 5);

  return (
    <>
      <SectionHeader title="Top comerciantes" subtitle="Grupos com mais gastos este mês" />
      <View style={styles.list}>
        {top.map((merchant) => (
          <Pressable
            key={merchant.id}
            onPress={() => router.push(`/settings/merchant-groups?group=${merchant.id}`)}
            style={({ pressed }) => [pressed && styles.pressed]}>
            <Card variant="outlined" style={styles.card}>
              <View style={styles.row}>
                <SymbolView
                  name={{ ios: 'storefront.fill', android: 'store', web: 'store' }}
                  tintColor={colors.primary}
                  size={20}
                />
                <View style={styles.content}>
                  <Text variant="bodyMedium">{merchant.name}</Text>
                  <Text variant="caption" color="textMuted">
                    {merchant.purchasesThisMonth} compras ·{' '}
                    {formatCurrency(merchant.monthAmount)} ·{' '}
                    {formatChangePercent(merchant.monthChangePercent)}
                  </Text>
                  {merchant.lastDate ? (
                    <Text variant="caption" color="textMuted">
                      Última: {formatDateShort(merchant.lastDate)}
                      {merchant.lastAmount != null
                        ? ` · ${formatCurrency(merchant.lastAmount)}`
                        : ''}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => router.push('/settings/merchant-groups')}>
        <Text variant="bodyMedium" color="primary" style={styles.manageLink}>
          Gerir grupos
        </Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.92,
  },
  manageLink: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
});
