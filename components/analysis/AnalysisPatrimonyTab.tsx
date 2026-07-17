import { StyleSheet, View } from 'react-native';

import { AnalysisMetricCard } from '@/components/analysis/AnalysisMetricCard';
import { PatrimonyAllocationCard } from '@/components/analysis/PatrimonyAllocationCard';
import { Card, Text } from '@/components/ui';
import type { AnalysisData } from '@/lib/domain/analysis.types';
import { spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type AnalysisPatrimonyTabProps = {
  data: AnalysisData;
};

export function AnalysisPatrimonyTab({ data }: AnalysisPatrimonyTabProps) {
  const { breakdown, totalLiabilities, netWorth } = data.netWorth;
  const cash = breakdown.accounts;
  const investments = breakdown.investments;
  const inventory = breakdown.inventory;
  const savings = breakdown.savings;

  const patrimonyMetrics = data.metrics.filter((metric) =>
    ['debt-ratio', 'investment-share', 'liquidity', 'inventory-share'].includes(metric.id),
  );

  /** Alocação só com componentes ≥ 0 — saldos negativos ficam na linha de caixa. */
  const allocationPositive = data.allocation.filter((item) => item.value > 0);

  return (
    <View style={styles.container}>
      <Card variant="elevated" style={styles.netWorthCard}>
        <Text variant="caption" color="textMuted">
          Património líquido
        </Text>
        <Text variant="h2" color={netWorth < 0 ? 'danger' : 'text'}>
          {formatCurrency(netWorth)}
        </Text>

        <View style={styles.lines}>
          <View style={styles.line}>
            <Text variant="caption" color="textSecondary">
              Saldos e caixa
            </Text>
            <Text variant="bodyMedium" color={cash < 0 ? 'danger' : 'text'}>
              {formatCurrency(cash)}
            </Text>
          </View>
          <View style={styles.line}>
            <Text variant="caption" color="textSecondary">
              Investimentos
            </Text>
            <Text variant="bodyMedium">{formatCurrency(investments)}</Text>
          </View>
          <View style={styles.line}>
            <Text variant="caption" color="textSecondary">
              Bens
            </Text>
            <Text variant="bodyMedium">{formatCurrency(inventory)}</Text>
          </View>
          {savings > 0 ? (
            <View style={styles.line}>
              <Text variant="caption" color="textSecondary">
                Poupanças reservadas
              </Text>
              <Text variant="bodyMedium">{formatCurrency(savings)}</Text>
            </View>
          ) : null}
          <View style={styles.line}>
            <Text variant="caption" color="textSecondary">
              Dívidas
            </Text>
            <Text variant="bodyMedium" color="danger">
              −{formatCurrency(totalLiabilities)}
            </Text>
          </View>
        </View>
      </Card>

      {allocationPositive.length > 0 ? (
        <PatrimonyAllocationCard
          allocation={allocationPositive}
          totalAssets={Math.max(
            0,
            Math.max(0, cash) + investments + inventory + Math.max(0, savings),
          )}
        />
      ) : null}

      <View style={styles.metricsGrid}>
        {patrimonyMetrics.map((metric) => (
          <AnalysisMetricCard key={metric.id} metric={metric} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  netWorthCard: {
    gap: spacing.sm,
  },
  lines: {
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  metricsGrid: {
    gap: spacing.sm,
  },
});
