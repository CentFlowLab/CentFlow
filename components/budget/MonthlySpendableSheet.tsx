import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Card, Text } from '@/components/ui';
import { useMonthlySpendable } from '@/hooks/useMonthlySpendable';
import { getAccountTypeLabel } from '@/lib/domain/account.types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type MonthlySpendableSheetProps = {
  visible: boolean;
  onClose: () => void;
};

function formatEndOfMonthLabel(reference: Date): string {
  const lastDay = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long' }).format(lastDay);
}

function BreakdownRow({
  label,
  value,
  tone = 'text',
  prefix = '',
}: {
  label: string;
  value: number;
  tone?: 'text' | 'success' | 'danger' | 'textSecondary';
  prefix?: string;
}) {
  if (value === 0) return null;
  return (
    <View style={styles.statRow}>
      <Text variant="caption" color="textSecondary">
        {prefix}
        {label}
      </Text>
      <Text variant="bodyMedium" color={tone}>
        {formatCurrency(value)}
      </Text>
    </View>
  );
}

function AccountListBlock({
  title,
  accounts,
  muted,
}: {
  title: string;
  accounts: Array<{ name: string; balance: number; type: string }>;
  muted?: boolean;
}) {
  if (accounts.length === 0) return null;
  return (
    <View style={styles.accountBlock}>
      <Text variant="label" color="textMuted">
        {title}
      </Text>
      {accounts.map((account) => (
        <View key={account.name} style={styles.statRow}>
          <Text variant="caption" color={muted ? 'textMuted' : 'textSecondary'}>
            {account.name}
            {muted ? ` — ${getAccountTypeLabel(account.type as never)}` : ''}
          </Text>
          <Text variant="bodyMedium" color={muted ? 'textSecondary' : 'text'}>
            {formatCurrency(account.balance)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function MonthlySpendableSheet({ visible, onClose }: MonthlySpendableSheetProps) {
  const reference = new Date();
  const spendable = useMonthlySpendable(reference);
  const { components } = spendable;
  const endLabel = formatEndOfMonthLabel(reference);
  const remainingTone =
    spendable.available <= 0
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
              Dinheiro em contas de gasto corrente — investimentos e poupança ficam fora
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
          {formatCurrency(spendable.available)}
        </Text>
        <Text variant="bodyMedium" color="textSecondary">
          {formatCurrency(spendable.dailySafeSpend)}/dia até {endLabel}
        </Text>
        {spendable.consumptionSpending > 0 ? (
          <Text variant="caption" color="textMuted">
            Gastos de consumo este mês: {formatCurrency(spendable.consumptionSpending)} (inclui
            cartão)
          </Text>
        ) : null}
      </Card>

      <Card variant="outlined" style={styles.detailCard}>
        <AccountListBlock title="Contas incluídas no orçamento" accounts={spendable.budgetAccountsIncluded} />
        <AccountListBlock
          title="Fora do orçamento"
          accounts={spendable.budgetAccountsExcluded}
          muted
        />
      </Card>

      <Card variant="outlined" style={styles.detailCard}>
        <Text variant="label" color="textMuted" style={styles.sectionLabel}>
          Como calculámos
        </Text>
        <BreakdownRow
          label="Saldo em contas do orçamento"
          value={components.budgetAccountBalance}
          tone="success"
        />
        <BreakdownRow
          label="Obrigações futuras"
          value={components.futureObligations}
          prefix="− "
        />
        <View style={styles.divider} />
        <View style={styles.statRow}>
          <Text variant="bodyMedium">= Disponível este mês</Text>
          <Text variant="bodyMedium" style={{ color: remainingTone }}>
            {formatCurrency(spendable.available)}
          </Text>
        </View>
        <Text variant="label" color="textMuted" style={styles.sectionLabel}>
          Actividade deste mês (já reflectida no saldo)
        </Text>
        <BreakdownRow label="Receitas recebidas" value={components.incomeReceived} tone="success" />
        <BreakdownRow
          label="Despesas em conta"
          value={components.registeredExpenses}
          prefix="− "
        />
        <BreakdownRow
          label="Pagamentos de cartão"
          value={components.creditCardPayments}
          prefix="− "
        />
        <BreakdownRow
          label="Reservado para objetivos"
          value={components.goalReserved}
          prefix="− "
        />
        <BreakdownRow
          label="Mensalidades pagas"
          value={components.loanPaymentsPaid}
          prefix="− "
        />
        <BreakdownRow
          label="Amortizações extra"
          value={components.loanAmortizationsPaid}
          prefix="− "
        />
        {components.movedOutOfBudget > 0 ? (
          <BreakdownRow
            label="Movido para fora do orçamento"
            value={components.movedOutOfBudget}
            prefix="− "
          />
        ) : null}
        {components.movedIntoBudget > 0 ? (
          <BreakdownRow
            label="Movido para orçamento"
            value={components.movedIntoBudget}
            tone="success"
            prefix="+ "
          />
        ) : null}
        {components.creditCardPurchases > 0 ? (
          <View style={styles.infoBlock}>
            <View style={styles.statRow}>
              <Text variant="caption" color="textSecondary">
                Compras com cartão
              </Text>
              <Text variant="bodyMedium" color="textSecondary">
                {formatCurrency(0)}
              </Text>
            </View>
            <Text variant="caption" color="textMuted">
              {formatCurrency(components.creditCardPurchases)} em consumo — não reduzem o
              disponível agora. Entram nos gastos e aumentam a dívida do cartão.
            </Text>
          </View>
        ) : null}
        {components.creditCardPayments > 0 ? (
          <Text variant="caption" color="textMuted">
            Pagamentos de cartão reduzem o saldo porque saem de uma conta elegível.
          </Text>
        ) : null}
      </Card>

      <Card variant="outlined" style={styles.notesCard}>
        {spendable.notes.map((note) => (
          <Text key={note} variant="caption" color="textMuted">
            · {note}
          </Text>
        ))}
      </Card>

      {spendable.obligations.length > 0 ? (
        <Card variant="outlined" style={styles.detailCard}>
          <Text variant="label" color="textMuted" style={styles.sectionLabel}>
            Próximas obrigações
          </Text>
          {spendable.obligations.map((item) => (
            <View key={`${item.kind}-${item.id}`} style={styles.statRow}>
              <Text variant="caption" color="textSecondary">
                {item.name}
              </Text>
              <Text variant="bodyMedium">{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {spendable.warnings.length > 0 ? (
        <Card variant="outlined" style={styles.warningCard}>
          {spendable.warnings.map((warning) => (
            <Text key={warning.code} variant="caption" color="textSecondary">
              {warning.message}
            </Text>
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
  detailCard: {
    gap: spacing.sm,
  },
  accountBlock: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  infoBlock: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  notesCard: {
    gap: spacing.xs,
  },
  sectionLabel: {
    marginTop: spacing.sm,
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
    marginVertical: spacing.xs,
  },
  warningCard: {
    borderColor: colors.warning,
    backgroundColor: colors.surfaceHighlight,
    gap: spacing.xs,
  },
});
