import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import type { NetWorthResult } from '@/lib/domain';
import { getSmartSummaryMessage, getTrendLabel } from '@/lib/home/smart-summary';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

type NetWorthHeroCardProps = {
  netWorth: NetWorthResult;
  changePercent: number;
  monthlyChange?: number;
  weeklySpending?: number;
  hasActivity?: boolean;
  onAddMovement?: () => void;
  onScanReceipt?: () => void;
};

function getNetWorthColor(value: number): string {
  if (value > 0) return colors.success;
  if (value < 0) return colors.danger;
  return colors.text;
}

function getChangeColor(percent: number): string {
  if (percent > 0) return colors.success;
  if (percent < 0) return colors.danger;
  return colors.textSecondary;
}

export function NetWorthHeroCard({
  netWorth,
  changePercent,
  monthlyChange = 0,
  weeklySpending = 0,
  hasActivity = true,
  onAddMovement,
  onScanReceipt,
}: NetWorthHeroCardProps) {
  const netWorthColor = getNetWorthColor(netWorth.netWorth);
  const changeColor = getChangeColor(changePercent);
  const trendLabel = getTrendLabel(changePercent);
  const smartMessage = getSmartSummaryMessage({
    hasActivity,
    netWorth: netWorth.netWorth,
    changePercent,
    monthlyChange,
    weeklySpending,
  });

  if (!hasActivity) {
    return (
      <Card variant="elevated" style={styles.card}>
          <View style={styles.emptyIcon}>
            <SymbolView
              name={{ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }}
              tintColor={colors.primary}
              size={28}
            />
          </View>
          <Text variant="h3" style={styles.emptyTitle}>
            Começa por adicionar o teu primeiro movimento
          </Text>
          <Text variant="body" color="textSecondary" style={styles.emptyDescription}>
            Digitaliza um talão ou regista manualmente — em segundos vês saldo, evolução e insights.
          </Text>
          {onAddMovement || onScanReceipt ? (
            <View style={styles.emptyActions}>
              {onScanReceipt ? (
                <Button
                  label="Digitalizar talão"
                  onPress={onScanReceipt}
                  fullWidth
                />
              ) : null}
              {onAddMovement ? (
                <Button
                  label="Adicionar movimento"
                  variant={onScanReceipt ? 'secondary' : 'primary'}
                  onPress={onAddMovement}
                  fullWidth
                  style={styles.emptyButton}
                />
              ) : null}
            </View>
          ) : null}
      </Card>
    );
  }

  return (
    <Card variant="elevated" style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text variant="label" color="textMuted">
              Saldo total
            </Text>
            <Text variant="caption" color="textSecondary">
              Património líquido actual
            </Text>
          </View>
          <View style={[styles.trendBadge, { borderColor: changeColor }]}>
            <Text variant="caption" style={{ color: changeColor, fontWeight: '600' }}>
              {trendLabel}
            </Text>
          </View>
        </View>

        <Text variant="display" style={[styles.value, { color: netWorthColor }]}>
          {formatCurrency(netWorth.netWorth)}
        </Text>

        <View style={styles.changeRow}>
          <Text variant="bodyMedium" style={{ color: changeColor }}>
            {formatPercent(changePercent)}
          </Text>
          <Text variant="caption" color="textSecondary">
            vs. mês anterior
          </Text>
          {monthlyChange !== 0 ? (
            <Text variant="caption" color="textMuted">
              · {monthlyChange > 0 ? '+' : ''}
              {formatCurrency(monthlyChange)} este mês
            </Text>
          ) : null}
        </View>

        <View style={styles.insightBox}>
          <Text variant="caption" color="textMuted" style={styles.insightLabel}>
            Leitura rápida
          </Text>
          <Text variant="caption" color="textSecondary">
            {smartMessage}
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
          label="Ver análises"
          variant="secondary"
          size="sm"
          onPress={() => router.push('/(tabs)/analises')}
          style={styles.button}
        />
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
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  trendBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.backgroundElevated,
  },
  value: {
    marginBottom: spacing.sm,
  },
  changeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  insightBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightLabel: {
    marginBottom: spacing.xs,
  },
  breakdown: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
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
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    marginTop: spacing.xs,
  },
  emptyActions: {
    width: '100%',
    gap: spacing.sm,
  },
});
