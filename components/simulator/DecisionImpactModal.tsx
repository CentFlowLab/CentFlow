import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text } from '@/components/ui';
import { useFinancialState } from '@/hooks/useFinancialState';
import { useGoalContributions } from '@/hooks/queries/useGoalContributions';
import { useLoanPayments } from '@/hooks/queries/useLoanPayments';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { useAssets } from '@/hooks/queries/useAssets';
import type { FinancialDecision } from '@/lib/domain/financial/decision-simulator';
import { simulateDecision } from '@/lib/domain/financial/decision-simulator';
import { SIMULATION_DISCLAIMER } from '@/lib/domain/financial/simulator.types';
import { traceSimulationCreated } from '@/lib/doctor/simulation-trace';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

export type DecisionImpactModalProps = {
  visible: boolean;
  onClose: () => void;
  decision: FinancialDecision | null;
  onConfirm?: () => void;
  confirmLabel?: string;
};

function MetricRow({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <View style={styles.metricRow}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyMedium">
        {before} → {after}
      </Text>
    </View>
  );
}

export function DecisionImpactModal({
  visible,
  onClose,
  decision,
  onConfirm,
  confirmLabel = 'Confirmar na mesma',
}: DecisionImpactModalProps) {
  const { state } = useFinancialState();
  const { data: transactions = [] } = useTransactions('all');
  const { data: goalContributions = [] } = useGoalContributions();
  const { data: loanPayments = [] } = useLoanPayments();
  const { data: assets } = useAssets();
  const { data: preferences } = useUserPreferences();

  const { result, simError } = useMemo(() => {
    if (!visible || !state || !decision) {
      return { result: null, simError: null as string | null };
    }
    try {
      return {
        result: simulateDecision(state, decision, {
          transactions,
          goalContributions,
          loanPayments,
          goals: assets?.goals,
          prioritizeDebtAmortization: preferences?.prioritizeDebtAmortization ?? true,
          asOf: state.asOf,
        }),
        simError: null,
      };
    } catch (err) {
      return {
        result: null,
        simError: err instanceof Error ? err.message : 'Erro na simulação',
      };
    }
  }, [
    visible,
    state,
    decision,
    transactions,
    goalContributions,
    loanPayments,
    assets?.goals,
    preferences?.prioritizeDebtAmortization,
  ]);
  useEffect(() => {
    if (!visible || !result) return;
    traceSimulationCreated({
      scenarioType: decision?.type ?? 'one_time_expense',
      durationMs: 0,
      warningsCount: result.goesNegativeThisMonth ? 1 : 0,
      screen: 'decision_impact_modal',
    });
  }, [visible, result, decision?.type]);

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="88%"
      header={(requestClose) => (
        <View style={styles.header}>
          <Text variant="h2">Simular antes de confirmar</Text>
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

        {simError ? (
          <Text variant="caption" color="danger">
            {simError}
          </Text>
        ) : null}

        {result ? (
          <Card variant="elevated" style={styles.resultCard}>
            <Text variant="bodyMedium" style={styles.headline}>
              {result.headline}
            </Text>
            <Text variant="caption" color="textSecondary">
              {result.recommendation}
            </Text>

            <View style={styles.section}>
              <Text variant="label">Antes vs Depois (30 dias)</Text>
              <MetricRow
                label="Saldo projetado"
                before={formatCurrency(result.balanceAt30DaysBefore)}
                after={formatCurrency(result.balanceAt30DaysAfter)}
              />
              <MetricRow
                label="Margem real estimada"
                before={formatCurrency(result.marginBefore)}
                after={formatCurrency(result.marginAfter)}
              />
            </View>

            {result.goalImpacts.length > 0 ? (
              <View style={styles.section}>
                <Text variant="label">Objetivos</Text>
                {result.goalImpacts.slice(0, 3).map((impact) => (
                  <Text key={impact.goalId} variant="caption" color="textSecondary">
                    • {impact.message}
                  </Text>
                ))}
              </View>
            ) : null}

            {result.goesNegativeThisMonth ? (
              <Text variant="caption" color="warning">
                Saldo negativo projetado
                {result.negativeCrossingDate ? ` a ${result.negativeCrossingDate}` : ' este mês'}.
              </Text>
            ) : null}
          </Card>
        ) : (
          <Text variant="caption" color="textMuted">
            Preenche valor e categoria para ver o impacto.
          </Text>
        )}

        <View style={styles.actions}>
          <Button label="Voltar" variant="ghost" onPress={onClose} />
          {onConfirm ? (
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              variant={result?.canProceedWithoutRisk ? 'primary' : 'secondary'}
            />
          ) : null}
        </View>
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
  resultCard: {
    gap: spacing.sm,
  },
  headline: {
    fontWeight: '700',
  },
  section: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  metricRow: {
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
});
