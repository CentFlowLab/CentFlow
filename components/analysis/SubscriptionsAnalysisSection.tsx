import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Card, SectionHeader, Text } from '@/components/ui';
import type { SubscriptionAnalysis } from '@/lib/insights/subscription-analysis';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

type SubscriptionsAnalysisSectionProps = {
  analysis: SubscriptionAnalysis | null;
};

function isMinimalAnalysis(analysis: SubscriptionAnalysis): boolean {
  return analysis.monthlyTotal <= 0 || analysis.items.length === 0;
}

export function SubscriptionsAnalysisSection({ analysis }: SubscriptionsAnalysisSectionProps) {
  if (!analysis || isMinimalAnalysis(analysis)) {
    return (
      <View style={styles.wrap}>
        <SectionHeader title="Recorrentes" />
        <Pressable
          onPress={() => router.push('/(tabs)/movimentos?view=subscricoes')}
          style={({ pressed }) => [styles.compactLink, pressed && styles.compactLinkPressed]}
          accessibilityRole="link"
          accessibilityLabel="Ver subscrições em Movimentos">
          <View style={styles.compactIcon}>
            <SymbolView
              name={{ ios: 'repeat.circle', android: 'autorenew', web: 'autorenew' }}
              tintColor={colors.primary}
              size={20}
            />
          </View>
          <View style={styles.compactText}>
            <Text variant="bodyMedium">Gerir subscrições</Text>
            <Text variant="caption" color="textMuted">
              Adiciona ou revê custos recorrentes em Movimentos
            </Text>
          </View>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor={colors.textMuted}
            size={16}
          />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Subscrições" />
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
  compactLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  compactLinkPressed: {
    opacity: 0.88,
    borderColor: colors.primary,
  },
  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactText: {
    flex: 1,
    gap: 2,
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
