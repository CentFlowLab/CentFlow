import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

type HomeChangesSheetProps = {
  visible: boolean;
  onClose: () => void;
  weeklySpending: number;
  netWorthChangeThisMonth: number;
  personalInflation: number | null;
};

export function HomeChangesSheet({
  visible,
  onClose,
  weeklySpending,
  netWorthChangeThisMonth,
  personalInflation,
}: HomeChangesSheetProps) {
  const netWorthChangeColor =
    netWorthChangeThisMonth > 0
      ? colors.success
      : netWorthChangeThisMonth < 0
        ? colors.danger
        : colors.text;

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="85%"
      header={(requestClose) => (
        <View style={styles.header}>
          <View>
            <Text variant="h2">O que mudou?</Text>
            <Text variant="caption" color="textMuted">
              Resumo rápido do período
            </Text>
          </View>
          <Pressable onPress={requestClose} hitSlop={12} accessibilityLabel="Fechar">
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
              tintColor={colors.textMuted}
              size={28}
            />
          </Pressable>
        </View>
      )}>
      <View style={styles.metricsGrid}>
        <MetricCard
          label="Gastos"
          value={formatCurrency(weeklySpending)}
          subtitle="esta semana"
          icon={{
            ios: 'cart.fill',
            android: 'shopping_cart',
            web: 'shopping_cart',
          }}
          iconColor={colors.danger}
          valueColor={colors.text}
        />
        <MetricCard
          label="Património"
          value={formatCompactChange(netWorthChangeThisMonth)}
          subtitle="este mês"
          icon={{
            ios: 'chart.line.uptrend.xyaxis',
            android: 'trending_up',
            web: 'trending_up',
          }}
          iconColor={netWorthChangeColor}
          valueColor={netWorthChangeColor}
        />
        <MetricCard
          label="Inflação"
          value={personalInflation !== null ? formatPercent(personalInflation) : '—'}
          subtitle="pessoal"
          icon={{
            ios: 'percent',
            android: 'percent',
            web: 'percent',
          }}
          iconColor={colors.accent}
          valueColor={
            personalInflation !== null && personalInflation > 0 ? colors.warning : colors.text
          }
        />
      </View>

      <Text variant="body" color="textSecondary" style={styles.note}>
        Estes indicadores reflectem a tua actividade recente. Abre Análises para tendências mais
        detalhadas.
      </Text>
    </DraggableBottomSheet>
  );
}

function formatCompactChange(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatCurrency(value)}`;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  note: {
    lineHeight: 22,
  },
});
