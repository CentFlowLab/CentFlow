import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { useCategoryBudgetStatus } from '@/hooks/queries/useCategoryBudgets';
import { colors, spacing } from '@/lib/theme';

import { CategoryBudgetProgressRow } from './CategoryBudgetProgressRow';
import { EditCategoryBudgetSheet } from './EditCategoryBudgetSheet';

export function CategoryBudgetAlertsCard() {
  const { statuses } = useCategoryBudgetStatus();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  const alerts = useMemo(
    () => statuses.filter((item) => item.level !== 'ok').slice(0, 2),
    [statuses],
  );

  const editingStatus = useMemo(
    () => statuses.find((item) => item.category === editingCategory) ?? null,
    [statuses, editingCategory],
  );

  if (alerts.length === 0) return null;

  return (
    <>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.header}>
          <Text variant="h3">Orçamento por categoria</Text>
          <Pressable onPress={() => router.push('/(tabs)/analises')} hitSlop={8}>
            <Text variant="caption" color="primary">
              Ver análises
            </Text>
          </Pressable>
        </View>
        <Text variant="caption" color="textMuted" style={styles.subtitle}>
          Este mês · limites activos
        </Text>

        <View style={styles.list}>
          {alerts.map((status) => (
            <CategoryBudgetProgressRow
              key={status.category}
              status={status}
              onPress={() => setEditingCategory(status.category)}
            />
          ))}
        </View>
      </Card>

      <EditCategoryBudgetSheet
        visible={editingStatus !== null}
        status={editingStatus}
        onClose={() => setEditingCategory(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
    borderColor: colors.warning,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
});
