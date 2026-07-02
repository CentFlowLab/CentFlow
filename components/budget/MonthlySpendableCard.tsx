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

export function MonthlySpendableCard({ onOpenDetails }: MonthlySpendableCardProps) {
  const reference = new Date();
  const spendable = useMonthlySpendable(reference);
  const valueTone =
    spendable.available <= 0
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
          Disponível este mês
        </Text>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          tintColor={colors.textMuted}
          size={16}
        />
      </View>
      <Text
        style={[styles.value, { color: valueTone }]}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
        numberOfLines={1}
        {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}>
        {formatCurrency(spendable.available)}
      </Text>
      <Text variant="caption" color="textSecondary" style={styles.subtitle}>
        {formatCurrency(spendable.dailySafeSpend)}/dia até {endOfMonthLabel(reference)} ·{' '}
        {spendable.daysRemaining} {spendable.daysRemaining === 1 ? 'dia' : 'dias'}
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
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  label: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  value: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 48,
    paddingVertical: spacing.xs,
  },
  subtitle: {
    paddingBottom: spacing.xs,
  },
});
