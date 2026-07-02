import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { useMonthlySpendable } from '@/hooks/useMonthlySpendable';
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

  return (
    <Card variant="elevated" style={styles.card}>
      <Card variant="default" onPress={onOpenDetails} padding={0} style={styles.tappable}>
        <View style={styles.headerRow}>
          <Text variant="label" color="textMuted">
            Disponível este mês
          </Text>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor={colors.textMuted}
            size={16}
          />
        </View>
        <Text style={[styles.value, { color: valueTone }]}>
          {formatCurrency(spendable.available)}
        </Text>
        <Text variant="caption" color="textSecondary">
          {formatCurrency(spendable.dailySafeSpend)}/dia até {endOfMonthLabel(reference)} ·{' '}
          {spendable.daysRemaining} {spendable.daysRemaining === 1 ? 'dia' : 'dias'}
        </Text>
      </Card>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  tappable: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 46,
  },
});
