import { useEffect, useMemo, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text } from '@/components/ui';
import { useFinancialState } from '@/hooks/useFinancialState';
import { useTransactions } from '@/hooks/queries/useTransactions';
import type { SimulationResult, SimulationScenario } from '@/lib/domain/financial/simulator';
import { SIMULATION_DISCLAIMER } from '@/lib/domain/financial/simulator.types';
import { simulateFinancialDecision } from '@/lib/domain/financial/simulator';
import type { SimulationScenarioType } from '@/lib/domain/financial/simulator.types';
import { groupTransactionsByCategory } from '@/lib/domain/financial/transactions';
import { getMonthKey } from '@/lib/domain/financial/dates';
import { isCardCredit } from '@/lib/credit/credit-type.utils';
import { traceSimulationCreated } from '@/lib/doctor/simulation-trace';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type DecisionSimulatorModalProps = {
  visible: boolean;
  onClose: () => void;
  presetType?: SimulationScenarioType;
  initialScenario?: SimulationScenario;
};

function ImpactRow({
  label,
  before,
  after,
  delta,
}: {
  label: string;
  before: string;
  after: string;
  delta?: string;
}) {
  return (
    <View style={styles.impactRow}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyMedium">
        {before} → {after}
        {delta ? ` (${delta})` : ''}
      </Text>
    </View>
  );
}

export function DecisionSimulatorModal({
  visible,
  onClose,
  presetType,
  initialScenario,
}: DecisionSimulatorModalProps) {
  const { state } = useFinancialState();
  const { data: transactions = [] } = useTransactions('all');
  const [amount, setAmount] = useState('100');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scenarioType = initialScenario?.type ?? presetType ?? 'amortize_credit';

  const categorySpending = useMemo(() => {
    if (!state) return {};
    const monthKey = getMonthKey(state.asOf);
    const totals = groupTransactionsByCategory(transactions, {
      kind: 'month',
      monthKey,
      asOf: state.asOf,
    });
    return Object.fromEntries(totals.map((row) => [row.key, row.amount]));
  }, [state, transactions]);

  useEffect(() => {
    if (!visible) {
      setResult(null);
      setError(null);
      return;
    }
    if (initialScenario && 'amount' in initialScenario && initialScenario.amount) {
      setAmount(String(initialScenario.amount));
    }
  }, [visible, initialScenario]);

  function buildScenario(): SimulationScenario | null {
    if (!state) return null;
    const parsedAmount = Number.parseFloat(amount.replace(',', '.')) || 0;

    if (initialScenario && 'amount' in initialScenario) {
      return { ...initialScenario, amount: parsedAmount || initialScenario.amount };
    }

    switch (scenarioType) {
      case 'amortize_credit': {
        const credit = state.credits.find((row) => !isCardCredit(row.creditType));
        const account =
          state.accounts.find((row) => row.id === 'global-cash') ??
          state.accounts.find((row) => row.budgetEnabledResolved);
        if (!credit || !account) return null;
        return { type: 'amortize_credit', creditId: credit.id, accountId: account.id, amount: parsedAmount };
      }
      case 'pay_credit_card': {
        const card = state.creditCards[0];
        const account =
          state.accounts.find((row) => row.id === 'global-cash') ??
          state.accounts.find((row) => row.budgetEnabledResolved);
        if (!card || !account) return null;
        return { type: 'pay_credit_card', creditId: card.credit.id, accountId: account.id, amount: parsedAmount };
      }
      case 'contribute_goal': {
        const goal = state.goalProgress[0];
        const account =
          state.accounts.find((row) => row.id === 'global-cash') ??
          state.accounts.find((row) => row.budgetEnabledResolved);
        if (!goal || !account) return null;
        return { type: 'contribute_goal', goalId: goal.id, accountId: account.id, amount: parsedAmount };
      }
      case 'cancel_subscription': {
        const sub = state.subscriptions.items[0];
        if (!sub) return null;
        return { type: 'cancel_subscription', subscriptionId: sub.id };
      }
      case 'reduce_category_spending': {
        const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0];
        if (!topCategory) return null;
        return {
          type: 'reduce_category_spending',
          categoryKey: topCategory[0],
          categoryLabel: topCategory[0],
          reductionPercent: 20,
        };
      }
      case 'increase_monthly_savings':
        return { type: 'increase_monthly_savings', amount: parsedAmount };
      case 'increase_monthly_income':
        return { type: 'increase_monthly_income', amount: parsedAmount };
      default:
        return null;
    }
  }

  function handleSimulate() {
    if (!state) return;
    setError(null);
    const started = Date.now();
    try {
      const scenario = buildScenario();
      if (!scenario) {
        setError('Não há dados suficientes para esta simulação.');
        return;
      }
      const output = simulateFinancialDecision({
        financialState: state,
        scenario,
        categorySpending,
      });
      setResult(output);
      traceSimulationCreated({
        scenarioType: output.scenarioType,
        durationMs: Date.now() - started,
        warningsCount: output.warnings.length,
        screen: 'decision_simulator_modal',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na simulação');
    }
  }

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="88%"
      header={(requestClose) => (
        <View style={styles.header}>
          <Text variant="h2">Simular decisão</Text>
          <Pressable onPress={requestClose} hitSlop={12} accessibilityLabel="Fechar">
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
              tintColor={colors.textMuted}
              size={28}
            />
          </Pressable>
        </View>
      )}>
      <View style={styles.content}>
        <Text variant="caption" color="textMuted">
          {SIMULATION_DISCLAIMER}
        </Text>

        {scenarioType !== 'cancel_subscription' && scenarioType !== 'reduce_category_spending' ? (
          <View style={styles.field}>
            <Text variant="label">Valor (€)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        ) : null}

        {error ? (
          <Text variant="caption" color="danger">
            {error}
          </Text>
        ) : null}

        <Button label="Calcular impacto" onPress={handleSimulate} />

        {result ? (
          <Card variant="elevated" style={styles.resultCard}>
            <Text variant="bodyMedium" style={styles.resultTitle}>
              {result.title}
            </Text>
            <Text variant="caption" color="textSecondary">
              {result.explanation.summary}
            </Text>

            <View style={styles.section}>
              <Text variant="label">Antes / Depois</Text>
              {result.impact.slice(0, 5).map((line) => (
                <ImpactRow
                  key={line.label}
                  label={line.label}
                  before={line.before}
                  after={line.after}
                  delta={line.delta}
                />
              ))}
            </View>

            {result.explanation.benefits.length > 0 ? (
              <View style={styles.section}>
                <Text variant="label" color="success">
                  Benefícios
                </Text>
                {result.explanation.benefits.map((line) => (
                  <Text key={line} variant="caption" color="textSecondary">
                    • {line}
                  </Text>
                ))}
              </View>
            ) : null}

            {result.explanation.risks.length > 0 ? (
              <View style={styles.section}>
                <Text variant="label" color="warning">
                  Riscos
                </Text>
                {result.explanation.risks.map((line) => (
                  <Text key={line} variant="caption" color="textSecondary">
                    • {line}
                  </Text>
                ))}
              </View>
            ) : null}

            {result.warnings.length > 0 ? (
              <View style={styles.section}>
                {result.warnings.map((warning) => (
                  <Text key={warning.code} variant="caption" color="warning">
                    ⚠ {warning.message}
                  </Text>
                ))}
              </View>
            ) : null}

            <Text variant="caption" color="textMuted">
              Disponível: {formatCurrency(result.before.availableThisMonth)} →{' '}
              {formatCurrency(result.after.availableThisMonth)} · PL:{' '}
              {formatCurrency(result.before.netWorth)} → {formatCurrency(result.after.netWorth)}
            </Text>

            <Text variant="caption" color="primary">
              {result.recommendation}
            </Text>
          </Card>
        ) : null}
      </View>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
  },
  resultCard: {
    gap: spacing.sm,
  },
  resultTitle: {
    fontWeight: '600',
  },
  section: {
    gap: spacing.xs,
  },
  impactRow: {
    gap: 2,
  },
});
