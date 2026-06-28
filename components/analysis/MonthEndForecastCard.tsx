import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { MonthSpendingForecast } from '@/lib/insights/spending-forecast';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type MonthEndForecastCardProps = {
  forecast: MonthSpendingForecast | null;
};

export function MonthEndForecastCard({ forecast }: MonthEndForecastCardProps) {
  if (!forecast) return null;

  const monthCapitalized =
    forecast.monthLabel.charAt(0).toUpperCase() + forecast.monthLabel.slice(1);

  return (
    <Card variant="outlined" style={styles.card}>
      <Text variant="label" color="textMuted">
        Previsão — fim de {monthCapitalized}
      </Text>
      <Text variant="body" color="textSecondary">
        Gastaste {formatCurrency(forecast.spentSoFar)} em {forecast.daysPassed} dias.
      </Text>
      <Text variant="bodyMedium">
        No ritmo actual: ~{formatCurrency(forecast.projectedTotal)} até dia {forecast.daysTotal}.
      </Text>
      {forecast.estimatedRemainingBudget != null ? (
        <Text
          variant="bodyMedium"
          style={{
            color:
              forecast.estimatedRemainingBudget >= 0 ? colors.success : colors.danger,
          }}>
          Disponível estimado: {formatCurrency(forecast.estimatedRemainingBudget)}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
    padding: spacing.md,
  },
});
