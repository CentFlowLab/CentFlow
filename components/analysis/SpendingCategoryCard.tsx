import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryBudgetProgressRow, EditCategoryBudgetSheet } from '@/components/budget';
import { DonutChart, type DonutSegment } from '@/components/charts';
import { Card, Text } from '@/components/ui';
import type { CategoryBudgetStatus } from '@/lib/domain/category-budget.types';
import type { SpendingCategorySlice } from '@/lib/domain/analysis.types';
import { getSpendingChartColors } from '@/lib/domain/analysis.compose';
import { formatCurrency, formatPercent } from '@/lib/utils/format';
import { colors, radius, spacing } from '@/lib/theme';

type SpendingCategoryCardProps = {
  categories: SpendingCategorySlice[];
  periodLabel: string;
  budgetStatuses?: CategoryBudgetStatus[];
  showBudgetLimits?: boolean;
};

export function SpendingCategoryCard({
  categories,
  periodLabel,
  budgetStatuses = [],
  showBudgetLimits = false,
}: SpendingCategoryCardProps) {
  const palette = getSpendingChartColors();
  const total = categories.reduce((sum, item) => sum + item.amount, 0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  const budgetByCategory = useMemo(
    () => new Map(budgetStatuses.map((item) => [item.category, item])),
    [budgetStatuses],
  );

  const budgetAlerts = useMemo(
    () =>
      showBudgetLimits
        ? budgetStatuses.filter((item) => item.level !== 'ok').slice(0, 4)
        : [],
    [budgetStatuses, showBudgetLimits],
  );

  const editingStatus = useMemo(
    () => budgetStatuses.find((item) => item.category === editingCategory) ?? null,
    [budgetStatuses, editingCategory],
  );

  const selected = categories.find((item) => item.key === selectedKey) ?? null;
  const selectedPercent =
    selected && total > 0 ? (selected.amount / total) * 100 : 0;

  const segments: DonutSegment[] = categories.map((item, index) => ({
    value: item.amount,
    color:
      selectedKey && item.key !== selectedKey
        ? `${palette[index % palette.length]}40`
        : palette[index % palette.length],
    label: item.label,
  }));

  if (categories.length === 0) {
    return (
      <Card variant="elevated" style={styles.card}>
        <Text variant="h3" style={styles.title}>
          Gastos por categoria
        </Text>
        <Text variant="body" color="textSecondary" align="center" style={styles.emptyText}>
          Regista despesas para veres onde vai o teu dinheiro — categorias e percentagens aparecem aqui.
        </Text>
      </Card>
    );
  }

  return (
    <>
    <Card variant="elevated" style={styles.card}>
      <Text variant="h3" style={styles.title}>
        Gastos por categoria
      </Text>
      <Text variant="caption" color="textMuted" style={styles.subtitle}>
        {periodLabel}
      </Text>

      <View style={styles.chartRow}>
        <DonutChart
          segments={segments}
          size={150}
          strokeWidth={18}
          centerValue={selected ? formatCurrency(selected.amount) : formatCurrency(total)}
          centerLabel={selected ? selected.label : 'Total gastos'}
        />

        <View style={styles.legend}>
          {categories.map((item, index) => {
            const percent = total > 0 ? (item.amount / total) * 100 : 0;
            const color = palette[index % palette.length];
            const isSelected = item.key === selectedKey;
            const budget = budgetByCategory.get(item.key);

            return (
              <Pressable
                key={item.key}
                onPress={() => setSelectedKey(isSelected ? null : item.key)}
                style={[styles.legendItem, isSelected && styles.legendItemActive]}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}: ${formatCurrency(item.amount)}`}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <View style={styles.legendText}>
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {formatCurrency(item.amount)} · {formatPercent(percent, 0, false)}
                    {showBudgetLimits && budget
                      ? ` · limite ${formatCurrency(budget.monthlyLimit)}`
                      : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {selected ? (
        <Text variant="caption" color="textSecondary" style={styles.selectionHint}>
          {selected.label} representa {formatPercent(selectedPercent, 0, false)} dos gastos do
          período. Toca novamente para limpar.
        </Text>
      ) : (
        <Text variant="caption" color="textMuted" style={styles.selectionHint}>
          Toca numa categoria para a destacar.
        </Text>
      )}

      {showBudgetLimits && budgetAlerts.length > 0 ? (
        <View style={styles.budgetBlock}>
          <Text variant="label" color="textSecondary" style={styles.budgetTitle}>
            Limites este mês
          </Text>
          {budgetAlerts.map((status) => (
            <CategoryBudgetProgressRow
              key={status.category}
              status={status}
              compact
              onPress={() => setEditingCategory(status.category)}
            />
          ))}
        </View>
      ) : null}
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
    marginBottom: spacing['2xl'],
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  legend: {
    flex: 1,
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  legendItemActive: {
    backgroundColor: colors.surfaceHighlight,
  },
  selectionHint: {
    marginTop: spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    flex: 1,
    gap: 2,
  },
  emptyText: {
    paddingVertical: spacing['2xl'],
  },
  budgetBlock: {
    marginTop: spacing.lg,
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  budgetTitle: {
    marginBottom: spacing.xs,
  },
});
