import { StyleSheet, View } from 'react-native';

import { Card, SectionHeader, Text } from '@/components/ui';
import type { SubscriptionAnalysis } from '@/lib/insights/subscription-analysis';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

type SubscriptionsAnalysisSectionProps = {
  analysis: SubscriptionAnalysis | null;
};

export function SubscriptionsAnalysisSection({ analysis }: SubscriptionsAnalysisSectionProps) {
  if (!analysis) return null;

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Subscrições" subtitle="Custos recorrentes" />
      <Card variant="outlined" style={styles.card}>
        <View style={styles.totals}>
          <View>
            <Text variant="caption" color="textMuted">
              Total mensal
            </Text>
            <Text variant="bodyMedium">{formatCurrency(analysis.monthlyTotal)}</Text>
          </View>
          <View>
            <Text variant="caption" color="textMuted">
              Total anual
            </Text>
            <Text variant="bodyMedium">{formatCurrency(analysis.annualTotal)}</Text>
          </View>
        </View>

        <Text variant="label" color="textMuted" style={styles.subTitle}>
          Por categoria
        </Text>
        {analysis.byCategory.map((cat) => (
          <View key={cat.label} style={styles.catRow}>
            <Text variant="bodyMedium">{cat.label}</Text>
            <Text variant="caption" color="textMuted">
              {formatCurrency(cat.amount)} · {Math.round(cat.percent)}%
            </Text>
          </View>
        ))}

        <Text variant="label" color="textMuted" style={styles.subTitle}>
          Detalhe
        </Text>
        {analysis.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemMain}>
              <Text variant="bodyMedium">{item.name}</Text>
              {item.nextRenewal ? (
                <Text variant="caption" color="textMuted">
                  Próxima: {formatDateShort(item.nextRenewal)}
                </Text>
              ) : null}
            </View>
            <Text variant="bodyMedium">{formatCurrency(item.monthlyAmount)}/mês</Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  card: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  totals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  subTitle: {
    marginTop: spacing.sm,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  itemMain: {
    flex: 1,
    gap: 2,
  },
});
