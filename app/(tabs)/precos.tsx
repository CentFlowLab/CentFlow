import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/layout';
import {
  Card,
  ErrorState,
  PricesSkeleton,
  ScreenContainer,
  SectionHeader,
  Text,
} from '@/components/ui';
import { usePricesData } from '@/hooks/queries/usePricesData';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

export default function PrecosScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = usePricesData();

  return (
    <View style={styles.screen}>
      <AppHeader />

      {isLoading ? (
        <ScreenContainer>
          <PricesSkeleton />
        </ScreenContainer>
      ) : isError || !data ? (
        <View style={styles.centered}>
          <ErrorState
            context="prices"
            error={error}
            onRetry={() => refetch()}
            retryLoading={isRefetching}
          />
        </View>
      ) : (
        <ScreenContainer>
          <View style={styles.metricsRow}>
            <MetricTile
              label="Inflação pessoal"
              value={formatPercent(data.personalInflationPercent)}
              tone="warning"
              icon={{ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }}
            />
            <MetricTile
              label="Cesto médio"
              value={formatPercent(data.basketAverageChange)}
              tone="neutral"
              icon={{ ios: 'basket.fill', android: 'shopping_basket', web: 'shopping_basket' }}
            />
          </View>

          <Card variant="elevated" style={styles.trackedCard}>
            <Text variant="label" color="textMuted">
              Produtos monitorizados
            </Text>
            <Text variant="h1" color="primary">
              {data.trackedProducts}
            </Text>
            <Text variant="caption" color="textSecondary">
              Com base nos teus talões e subscrições
            </Text>
          </Card>

          <SectionHeader title="Variações recentes" />
          {data.changes.map((item) => {
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
                  <Text
                    variant="bodyMedium"
                    color={isUp ? 'danger' : 'success'}>
                    {isUp ? '+' : ''}
                    {formatPercent(item.changePercent)}
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text variant="caption" color="textMuted">
                    {formatCurrency(item.previousPrice)} → {formatCurrency(item.currentPrice)}
                  </Text>
                </View>
              </Card>
            );
          })}

          <SectionHeader title="Insights" />
          {data.insights.map((insight) => (
            <Card key={insight.id} variant="elevated" style={styles.insightCard}>
              <View style={styles.insightRow}>
                <SymbolView
                  name={{
                    ios:
                      insight.tone === 'warning'
                        ? 'exclamationmark.triangle.fill'
                        : insight.tone === 'success'
                          ? 'checkmark.seal.fill'
                          : 'info.circle.fill',
                    android:
                      insight.tone === 'warning'
                        ? 'warning'
                        : insight.tone === 'success'
                          ? 'verified'
                          : 'info',
                    web:
                      insight.tone === 'warning'
                        ? 'warning'
                        : insight.tone === 'success'
                          ? 'verified'
                          : 'info',
                  }}
                  tintColor={
                    insight.tone === 'warning'
                      ? colors.warning
                      : insight.tone === 'success'
                        ? colors.success
                        : colors.textSecondary
                  }
                  size={20}
                />
                <View style={styles.insightText}>
                  <Text variant="bodyMedium">{insight.title}</Text>
                  <Text variant="caption" color="textSecondary">
                    {insight.description}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </ScreenContainer>
      )}
    </View>
  );
}

type MetricTileProps = {
  label: string;
  value: string;
  tone: 'warning' | 'neutral' | 'success';
  icon: SymbolViewProps['name'];
};

function MetricTile({ label, value, tone, icon }: MetricTileProps) {
  const toneColor =
    tone === 'warning' ? colors.warning : tone === 'success' ? colors.success : colors.primary;

  return (
    <Card variant="elevated" style={styles.metricTile}>
      <SymbolView name={icon} tintColor={toneColor} size={20} />
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="h2" style={{ color: toneColor }}>
        {value}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metricTile: {
    flex: 1,
    gap: spacing.xs,
  },
  trackedCard: {
    gap: spacing.xs,
    marginBottom: spacing['2xl'],
  },
  changeCard: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  changeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  changeInfo: {
    flex: 1,
    gap: 2,
  },
  priceRow: {
    marginTop: spacing.xs,
  },
  insightsHeader: {
    marginTop: spacing.lg,
  },
  insightCard: {
    marginBottom: spacing.sm,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  insightText: {
    flex: 1,
    gap: spacing.xs,
  },
});
