import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Card, Text } from '@/components/ui';
import { useMonthlySpendable } from '@/hooks/useMonthlySpendable';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type MonthlySpendableSheetProps = {
  visible: boolean;
  onClose: () => void;
};

function formatEndOfMonthLabel(reference: Date): string {
  const lastDay = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long' }).format(lastDay);
}

function StatRow({
  label,
  value,
  tone = 'text',
}: {
  label: string;
  value: string;
  tone?: 'text' | 'success' | 'danger' | 'textSecondary';
}) {
  return (
    <View style={styles.statRow}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyMedium" color={tone}>
        {value}
      </Text>
    </View>
  );
}

export function MonthlySpendableSheet({ visible, onClose }: MonthlySpendableSheetProps) {
  const reference = new Date();
  const spendable = useMonthlySpendable(reference);
  const endLabel = formatEndOfMonthLabel(reference);
  const remainingTone =
    spendable.remainingThisMonth <= 0
      ? colors.danger
      : spendable.warnings.length > 0
        ? colors.warning
        : colors.primary;

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="88%"
      scrollContentStyle={styles.content}
      header={(requestClose) => (
        <View style={styles.header}>
          <View>
            <Text variant="h2">Disponível até ao fim do mês</Text>
            <Text variant="caption" color="textMuted">
              Orçamento mensal — não é o teu património
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
      <Card variant="elevated" style={styles.heroCard}>
        <Text variant="label" color="textMuted">
          Restam este mês
        </Text>
        <Text style={[styles.heroValue, { color: remainingTone }]}>
          {formatCurrency(spendable.remainingThisMonth)}
        </Text>
        <Text variant="bodyMedium" color="textSecondary">
          {formatCurrency(spendable.dailyAvailable)}/dia até {endLabel}
        </Text>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroPill}>
            <Text variant="caption" color="primary">
              {spendable.daysRemaining} {spendable.daysRemaining === 1 ? 'dia' : 'dias'} restantes
            </Text>
          </View>
        </View>
      </Card>

      {spendable.warnings.length > 0 ? (
        <Card variant="outlined" style={styles.warningCard}>
          {spendable.warnings.map((warning) => (
            <View key={warning.code} style={styles.warningRow}>
              <SymbolView
                name={{
                  ios: 'exclamationmark.triangle.fill',
                  android: 'warning',
                  web: 'warning',
                }}
                tintColor={colors.warning}
                size={16}
              />
              <Text variant="caption" color="textSecondary" style={styles.warningText}>
                {warning.message}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Card variant="outlined" style={styles.detailCard}>
        <StatRow label="Receitas previstas" value={formatCurrency(spendable.futureIncome)} tone="success" />
        <View style={styles.divider} />
        <StatRow label="Despesas previstas" value={formatCurrency(spendable.futureExpense)} tone="text" />
        <View style={styles.divider} />
        <StatRow
          label="Projeção fim do mês"
          value={formatCurrency(spendable.projectedEndOfMonthBalance)}
          tone={spendable.projectedEndOfMonthBalance < 0 ? 'danger' : 'textSecondary'}
        />
      </Card>

      {spendable.upcomingSubscriptions.length > 0 || spendable.upcomingInstallments.length > 0 ? (
        <Card variant="outlined" style={styles.detailCard}>
          <Text variant="label" color="textMuted" style={styles.sectionLabel}>
            Próximas obrigações
          </Text>
          {spendable.upcomingSubscriptions.map((item) => (
            <View key={`sub-${item.id}`} style={styles.statRow}>
              <Text variant="caption" color="textSecondary">
                {item.name}
              </Text>
              <Text variant="bodyMedium" color="text">
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
          {spendable.upcomingInstallments.map((item) => (
            <View key={`credit-${item.id}`} style={styles.statRow}>
              <Text variant="caption" color="textSecondary">
                {item.name} (prestação)
              </Text>
              <Text variant="bodyMedium" color="text">
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  heroCard: {
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  heroValue: {
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 58,
  },
  heroMetaRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  heroPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
  },
  warningCard: {
    gap: spacing.sm,
    borderColor: colors.warning,
    backgroundColor: colors.surfaceHighlight,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
  },
  detailCard: {
    gap: spacing.sm,
  },
  sectionLabel: {
    marginBottom: spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
