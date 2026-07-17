import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { useMonthlySpendable } from '@/hooks/useMonthlySpendable';
import { traceHomeAvailableCardRender } from '@/lib/doctor/recurring-payment-trace';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type MonthlySpendableCardProps = {
  onOpenDetails: () => void;
};

function endOfMonthLabel(reference: Date): string {
  const lastDay = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long' }).format(lastDay);
}

/**
 * Situação do mês — decompõe saldo de caixa, obrigações futuras e saldo previsto.
 * O valor hero é o saldo previsto (disponível), nunca apresentado sem contexto.
 */
export function MonthlySpendableCard({ onOpenDetails }: MonthlySpendableCardProps) {
  const reference = new Date();
  const spendable = useMonthlySpendable(reference);
  const cashBalance = spendable.components.budgetAccountBalance;
  const futureObligations = spendable.components.futureObligations;
  const predicted = spendable.available;
  const valueTone =
    predicted <= 0
      ? colors.danger
      : spendable.warnings.length > 0
        ? colors.warning
        : colors.primary;

  useEffect(() => {
    traceHomeAvailableCardRender({
      available: spendable.available,
      daysRemaining: spendable.daysRemaining,
    });
  }, [spendable.available, spendable.daysRemaining]);

  return (
    <Card variant="elevated" onPress={onOpenDetails} padding="2xl" style={styles.card}>
      <View style={styles.headerRow}>
        <Text variant="label" color="textMuted" style={styles.label}>
          Situação do mês
        </Text>
        <Text variant="caption" color="primary">
          Ver cálculo
        </Text>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          tintColor={colors.textMuted}
          size={16}
        />
      </View>

      <View style={styles.breakdown}>
        <View style={styles.row}>
          <Text variant="caption" color="textSecondary">
            Saldo de caixa
          </Text>
          <Text variant="bodyMedium">{formatCurrency(cashBalance)}</Text>
        </View>
        <View style={styles.row}>
          <Text variant="caption" color="textSecondary">
            Obrigações futuras
          </Text>
          <Text variant="bodyMedium">
            {futureObligations > 0 ? `−${formatCurrency(futureObligations)}` : formatCurrency(0)}
          </Text>
        </View>
      </View>

      <Text variant="caption" color="textMuted" style={styles.predictedLabel}>
        Saldo previsto até {endOfMonthLabel(reference)}
      </Text>
      <Text
        style={[styles.value, { color: valueTone }]}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
        numberOfLines={1}
        {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}>
        {formatCurrency(predicted)}
      </Text>
      <Text variant="caption" color="textSecondary" style={styles.subtitle}>
        {formatCurrency(spendable.dailySafeSpend)}/dia · {spendable.daysRemaining}{' '}
        {spendable.daysRemaining === 1 ? 'dia' : 'dias'} restantes
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    overflow: 'visible',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  label: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  breakdown: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  predictedLabel: {
    marginTop: spacing.xs,
  },
  value: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 44,
    paddingVertical: spacing.xs,
  },
  subtitle: {
    paddingBottom: spacing.xs,
  },
});
