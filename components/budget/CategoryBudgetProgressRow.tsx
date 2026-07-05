import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { CategoryBudgetStatus } from '@/lib/domain/category-budget.types';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type CategoryBudgetProgressRowProps = {
  status: CategoryBudgetStatus;
  onPress?: () => void;
  compact?: boolean;
};

function levelLabel(level: CategoryBudgetStatus['level']): string | null {
  if (level === 'over100') return 'Limite ultrapassado';
  if (level === 'warn80') return '80% do limite';
  return null;
}

function barColor(level: CategoryBudgetStatus['level']): string {
  if (level === 'over100') return colors.danger;
  if (level === 'warn80') return colors.warning;
  return colors.primary;
}

export function CategoryBudgetProgressRow({
  status,
  onPress,
  compact = false,
}: CategoryBudgetProgressRowProps) {
  const fillRatio = Math.min(status.ratio, 1);
  const badge = levelLabel(status.level);

  const content = (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <View style={styles.header}>
        <Text variant="bodyMedium" numberOfLines={1} style={styles.label}>
          {status.label}
        </Text>
        {badge ? (
          <Text
            variant="caption"
            style={{ color: barColor(status.level), fontWeight: '600' }}>
            {badge}
          </Text>
        ) : null}
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.round(fillRatio * 100)}%`,
              backgroundColor: barColor(status.level),
            },
          ]}
        />
      </View>

      <Text variant="caption" color="textMuted">
        {formatCurrency(status.spent)} de {formatCurrency(status.monthlyLimit)} este mês
        {status.level === 'over100'
          ? ` (+${formatCurrency(Math.max(0, status.spent - status.monthlyLimit))})`
          : null}
      </Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Orçamento ${status.label}`}
      style={({ pressed }) => [pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
  },
  rowCompact: {
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    flex: 1,
  },
  track: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  pressed: {
    opacity: 0.85,
  },
});
