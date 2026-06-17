import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { AnalysisTrends } from '@/lib/domain/analysis.types';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type DashboardFinancialSnapshotProps = {
  trends: AnalysisTrends | null;
};

export function DashboardFinancialSnapshot({ trends }: DashboardFinancialSnapshotProps) {
  if (!trends) {
    return null;
  }

  const topCategory = trends.spendingByCategory[0] ?? null;

  return (
    <View style={styles.container}>
      <Card variant="outlined" style={styles.card}>
        <Text variant="label" color="textMuted">
          Receitas vs gastos
        </Text>
        <View style={styles.statRow}>
          <StatBlock label="Receitas" value={formatCurrency(trends.totalIncome)} tone={colors.success} />
          <StatBlock label="Gastos" value={formatCurrency(trends.totalExpenses)} tone={colors.danger} />
        </View>
        <View style={styles.netRow}>
          <Text variant="caption" color="textSecondary">
            Fluxo líquido mensal
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: trends.netCashflow >= 0 ? colors.primary : colors.warning }}>
            {formatCurrency(trends.netCashflow)}
          </Text>
        </View>
      </Card>

      <Card variant="outlined" style={styles.card}>
        <Text variant="label" color="textMuted">
          Categoria principal
        </Text>
        {topCategory ? (
          <>
            <Text variant="h3">{topCategory.label}</Text>
            <Text variant="bodyMedium" color="primary">
              {formatCurrency(topCategory.amount)}
            </Text>
            <Text variant="caption" color="textSecondary">
              Maior peso nos teus gastos deste período
            </Text>
          </>
        ) : (
          <>
            <Text variant="bodyMedium">Ainda sem categorias suficientes</Text>
            <Text variant="caption" color="textSecondary">
              Regista mais movimentos para destacar onde gastas mais.
            </Text>
          </>
        )}
      </Card>
    </View>
  );
}

function StatBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <View style={styles.statBlock}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ color: tone }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  card: {
    gap: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBlock: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
