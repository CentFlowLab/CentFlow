import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import type { NetWorthResult } from '@/lib/domain';
import { formatCurrency, formatPercent } from '@/lib/utils/format';
import { colors, radius, spacing } from '@/lib/theme';

type NetWorthHeroCardProps = {
  netWorth: NetWorthResult;
  changePercent: number;
};

function getNetWorthColor(value: number): string {
  if (value > 0) return colors.success;
  if (value < 0) return colors.danger;
  return colors.textSecondary;
}

function getChangeColor(percent: number): string {
  if (percent > 0) return colors.success;
  if (percent < 0) return colors.danger;
  return colors.textMuted;
}

export function NetWorthHeroCard({ netWorth, changePercent }: NetWorthHeroCardProps) {
  const netWorthColor = getNetWorthColor(netWorth.netWorth);
  const changeColor = getChangeColor(changePercent);

  return (
    <Card variant="elevated" padding={0} style={styles.card}>
      <LinearGradient
        colors={[colors.surfaceElevated, colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        <View style={styles.header}>
          <Text variant="label" color="textMuted">
            Onde estou?
          </Text>
          <Text variant="caption" color="textMuted">
            Património líquido
          </Text>
        </View>

        <Text variant="display" style={[styles.value, { color: netWorthColor }]}>
          {formatCurrency(netWorth.netWorth)}
        </Text>

        <View style={styles.changeRow}>
          <Text variant="bodyMedium" style={{ color: changeColor }}>
            {formatPercent(changePercent)}
          </Text>
          <Text variant="caption" color="textMuted">
            vs. mês anterior
          </Text>
        </View>

        <View style={styles.breakdown}>
          <BreakdownItem label="Ativos" value={netWorth.totalAssets} color={colors.text} />
          <View style={styles.breakdownDivider} />
          <BreakdownItem
            label="Passivos"
            value={netWorth.totalLiabilities}
            color={colors.danger}
          />
        </View>

        <Button
          label="Ver detalhe"
          variant="secondary"
          size="sm"
          onPress={() => router.push('/(tabs)/analises')}
          style={styles.button}
        />
      </LinearGradient>
    </Card>
  );
}

function BreakdownItem({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.breakdownItem}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ color }}>
        {formatCurrency(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing['2xl'],
    overflow: 'hidden',
  },
  gradient: {
    padding: spacing.xl,
    borderRadius: radius.lg,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  value: {
    marginBottom: spacing.sm,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  breakdown: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakdownItem: {
    flex: 1,
    gap: spacing.xs,
  },
  breakdownDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  button: {
    alignSelf: 'flex-start',
  },
});
