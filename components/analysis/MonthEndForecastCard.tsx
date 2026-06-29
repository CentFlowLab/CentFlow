import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { MonthSpendingForecast } from '@/lib/insights/spending-forecast';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

import { AnalysisSectionEmpty } from './AnalysisSectionEmpty';

type MonthEndForecastCardProps = {
  forecast: MonthSpendingForecast | null;
};

function hasForecastData(forecast: MonthSpendingForecast | null): forecast is MonthSpendingForecast {
  return forecast != null && forecast.spentSoFar > 0 && forecast.daysPassed >= 3;
}

export function MonthEndForecastCard({ forecast }: MonthEndForecastCardProps) {
  if (!hasForecastData(forecast)) {
    return (
      <View style={styles.wrap}>
        <AnalysisSectionEmpty
          icon={
            <SymbolView
              name={{ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }}
              tintColor={colors.textMuted}
              size={28}
            />
          }
          title="Previsão indisponível"
          description="Precisas de alguns dias de despesas registadas para estimar o fim do mês."
        />
      </View>
    );
  }

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
  wrap: {
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
    padding: spacing.md,
  },
});
