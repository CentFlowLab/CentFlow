import { StyleSheet, View } from 'react-native';

import { Card, LoadingSpinner, Text } from '@/components/ui';
import { SPENDING_BENCHMARKS_UI_ENABLED } from '@/lib/benchmarks/config';
import { useSpendingBenchmarkComparisons } from '@/lib/benchmarks/useSpendingBenchmarkComparisons';
import { spacing } from '@/lib/theme';

/** Comparação anónima com pares de rendimento semelhante — inactiva por defeito. */
export function SpendingBenchmarkCard() {
  if (!SPENDING_BENCHMARKS_UI_ENABLED) return null;

  const { comparisons, isLoading, isActive } = useSpendingBenchmarkComparisons();

  if (!isActive) return null;
  if (isLoading) {
    return (
      <Card variant="outlined" style={styles.card}>
        <LoadingSpinner message="A carregar comparações..." />
      </Card>
    );
  }
  if (comparisons.length === 0) return null;

  return (
    <Card variant="outlined" style={styles.card}>
      <Text variant="h3">Comparação anónima</Text>
      <Text variant="caption" color="textMuted" style={styles.subtitle}>
        Pessoas com rendimento semelhante (dados agregados, nunca identificáveis)
      </Text>
      <View style={styles.list}>
        {comparisons.slice(0, 4).map((item) => (
          <View key={item.category} style={styles.row}>
            <Text variant="body" color="textSecondary">
              {item.message}
            </Text>
            <Text variant="caption" color="textMuted">
              Baseado em {item.sampleCount} perfis anónimos
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  subtitle: {
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
});
