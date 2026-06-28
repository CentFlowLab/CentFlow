import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Card, SectionHeader, Text } from '@/components/ui';
import type { CategoryBreakdownItem } from '@/lib/insights/category-breakdown';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

type CategoryBreakdownListProps = {
  items: CategoryBreakdownItem[];
  onSelectCategory?: (key: string) => void;
};

export function CategoryBreakdownList({ items, onSelectCategory }: CategoryBreakdownListProps) {
  if (items.length === 0) return null;

  const maxAmount = items[0]?.amount ?? 1;

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Despesas por categoria" subtitle="Detalhe do mês corrente" />
      <Card variant="outlined" style={styles.card}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => {
              onSelectCategory?.(item.key);
              router.push(`/(tabs)/movimentos?category=${item.key}`);
            }}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <SymbolView name={item.icon} tintColor={colors.primary} size={18} />
            <View style={styles.content}>
              <View style={styles.topLine}>
                <Text variant="bodyMedium" numberOfLines={1} style={styles.name}>
                  {item.label}
                </Text>
                <Text variant="bodyMedium">{formatCurrency(item.amount)}</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[styles.barFill, { width: `${(item.amount / maxAmount) * 100}%` }]}
                />
              </View>
              <View style={styles.meta}>
                <Text variant="caption" color="textMuted">
                  {formatPercent(item.percent, 0, false)}
                </Text>
                {item.changePercent != null ? (
                  <Text
                    variant="caption"
                    style={{
                      color:
                        item.changePercent > 0
                          ? colors.danger
                          : item.changePercent < 0
                            ? colors.success
                            : colors.textMuted,
                    }}>
                    {item.changePercent > 0 ? '↑' : item.changePercent < 0 ? '↓' : '→'}
                    {Math.abs(item.changePercent)}%
                  </Text>
                ) : (
                  <Text variant="caption" color="textMuted">
                    →
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  card: {
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.9,
  },
});
