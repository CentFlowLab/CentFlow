import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { RealSavingsMarginBreakdown } from '@/lib/domain/financial/savings-margin';
import { spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type SavingsMarginBreakdownLinesProps = {
  margin: RealSavingsMarginBreakdown;
  suggestedAmount?: number;
};

/** Passos do cálculo da margem real — valores vindos do runtime, não hardcoded. */
export function SavingsMarginBreakdownLines({
  margin,
  suggestedAmount,
}: SavingsMarginBreakdownLinesProps) {
  const bufferPercent = Math.round((1 - margin.capRatio) * 100);

  return (
    <View style={styles.container}>
      <Text variant="caption" color="textMuted">
        1. Disponível este mês: {formatCurrency(margin.availableThisMonth)}
      </Text>
      <Text variant="caption" color="textMuted">
        2. Mediana gasto variável ({margin.variableMonthsUsed} meses):{' '}
        {formatCurrency(margin.variableMedianMonthly)}/mês
      </Text>
      <Text variant="caption" color="textMuted">
        3. Projeção até fim do mês ({margin.daysRemaining} de {margin.daysInMonth} dias):{' '}
        {formatCurrency(margin.variableProjection)}
      </Text>
      <Text variant="caption" color="textMuted">
        4. Margem real estimada: {formatCurrency(margin.rawMargin)}
      </Text>
      <Text variant="caption" color="textMuted">
        5. Almofada de segurança ({bufferPercent}%): acção até{' '}
        {formatCurrency(margin.cappedActionBudget)}
        {suggestedAmount !== undefined
          ? ` · sugerido ${formatCurrency(suggestedAmount)}`
          : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
