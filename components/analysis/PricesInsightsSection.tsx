import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, EmptyState, SectionHeader, Text } from '@/components/ui';
import type { PricesData } from '@/lib/data/prices.mocks';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

type PricesInsightsSectionProps = {
  prices: PricesData;
  onAddMovement?: () => void;
};

export function PricesInsightsSection({ prices, onAddMovement }: PricesInsightsSectionProps) {
  const hasData = prices.trackedProducts > 0 || prices.changes.length > 0 || prices.insights.length > 0;

  return (
    <View style={styles.container}>
      <SectionHeader title="Preços" subtitle={prices.periodLabel} />

      {!hasData ? (
        <EmptyState
          icon={
            <SymbolView
              name={{ ios: 'tag.fill', android: 'sell', web: 'sell' }}
              tintColor={colors.primary}
              size={30}
            />
          }
          title="Monitoriza preços"
          description="Regista compras e subscrições para juntares histórico de preços às tuas análises."
          actionLabel="Adicionar movimento"
          onAction={onAddMovement}
        />
      ) : (
        <>
          <View style={styles.metricsRow}>
            <MetricCard
              label="Inflação pessoal"
              value={formatPercent(prices.personalInflationPercent)}
              tone={colors.warning}
            />
            <MetricCard
              label="Produtos monitorizados"
              value={String(prices.trackedProducts)}
              tone={colors.primary}
            />
          </View>

          {prices.changes.slice(0, 3).map((item) => {
            const isUp = item.changePercent > 0;
            return (
              <Card key={item.id} variant="outlined" style={styles.changeCard}>
                <View style={styles.changeHeader}>
                  <View style={styles.changeInfo}>
                    <Text variant="bodyMedium">{item.product}</Text>
                    <Text variant="caption" color="textMuted">
                      {item.category} · {item.store}
                    </Text>
                  </View>
                  <Text variant="bodyMedium" color={isUp ? 'danger' : 'success'}>
                    {formatPercent(item.changePercent)}
                  </Text>
                </View>
                <Text variant="caption" color="textSecondary">
                  {formatCurrency(item.previousPrice)} → {formatCurrency(item.currentPrice)}
                </Text>
              </Card>
            );
          })}

          {prices.insights.map((insight) => (
            <Card key={insight.id} variant="outlined" style={styles.changeCard}>
              <Text variant="bodyMedium">{insight.title}</Text>
              <Text variant="caption" color="textSecondary">
                {insight.description}
              </Text>
            </Card>
          ))}
        </>
      )}
    </View>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <Card variant="outlined" style={styles.metricCard}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="h3" style={{ color: tone }}>
        {value}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    gap: spacing.xs,
  },
  changeCard: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  changeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  changeInfo: {
    flex: 1,
    gap: spacing.xs,
  },
});
