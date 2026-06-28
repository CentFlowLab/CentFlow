import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, SectionHeader, Text, TextField } from '@/components/ui';
import { analyzeCredit, simulateEarlyAmortization } from '@/lib/credit/credit-analysis';
import type { Credit } from '@/lib/domain/types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type CreditsAnalysisSectionProps = {
  credits: Credit[];
  monthlyIncome?: number;
};

export function CreditsAnalysisSection({ credits, monthlyIncome }: CreditsAnalysisSectionProps) {
  const active = (credits ?? []).filter((c) => (c.outstandingBalance ?? 0) > 0);
  if (active.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Análise de créditos" subtitle="Estimativas com TAEG" />
      {active.map((credit) => (
        <CreditAnalysisCard key={credit.id} credit={credit} monthlyIncome={monthlyIncome} />
      ))}
    </View>
  );
}

function CreditAnalysisCard({
  credit,
  monthlyIncome,
}: {
  credit: Credit;
  monthlyIncome?: number;
}) {
  const [extraPayment, setExtraPayment] = useState('500');
  const analysis = analyzeCredit({
    outstandingBalance: credit.outstandingBalance,
    originalAmount: credit.originalAmount,
    interestRateAnnual: credit.interestRateAnnual,
    indexRate: credit.indexRate,
    spread: credit.spread,
    termMonths: credit.termMonths,
    monthlyPayment: credit.monthlyPayment,
    nextPaymentAmount: credit.nextPaymentAmount,
    monthlyIncome,
  });

  const original = credit.originalAmount ?? credit.outstandingBalance;
  const paidPercent =
    original > 0
      ? Math.max(0, Math.min(100, ((original - credit.outstandingBalance) / original) * 100))
      : 0;

  const extra = Number(extraPayment.replace(',', '.')) || 0;
  const early =
    extra > 0
      ? simulateEarlyAmortization(
          credit.outstandingBalance,
          analysis.monthlyPayment,
          analysis.effectiveAnnualRate,
          extra,
        )
      : null;

  const paidInterest = Math.max(
    0,
    analysis.totalInterest * (1 - credit.outstandingBalance / Math.max(original, 1)),
  );

  return (
    <Card variant="outlined" style={styles.card}>
      <Text variant="bodyMedium">
        {credit.name} — {formatCurrency(credit.outstandingBalance)}
      </Text>
      <Text variant="caption" color="textMuted">
        Progresso de pagamento
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${paidPercent}%` }]} />
      </View>
      <Text variant="caption" color="textMuted">
        {paidPercent.toFixed(0)}% pago
      </Text>

      <Text variant="label" color="textMuted" style={styles.blockTitle}>
        Estimativas (TAEG {analysis.effectiveAnnualRate.toFixed(2)}%)
      </Text>
      <Text variant="caption" color="textSecondary">
        Prestação mensal estimada: ~{formatCurrency(analysis.monthlyPayment)}
      </Text>
      <Text variant="caption" color="textSecondary">
        Juros totais estimados: ~{formatCurrency(analysis.totalInterest)}
      </Text>
      {analysis.remainingMonths ? (
        <Text variant="caption" color="textSecondary">
          Liquidação prevista: ~{analysis.remainingMonths} meses
        </Text>
      ) : null}

      <Text variant="label" color="textMuted" style={styles.blockTitle}>
        Já paguei (estimativa)
      </Text>
      <Text variant="caption" color="textSecondary">
        Capital: {formatCurrency(original - credit.outstandingBalance)} · Juros:{' '}
        {formatCurrency(paidInterest)}
      </Text>

      <TextField
        label="Amortização extra (€)"
        value={extraPayment}
        onChangeText={setExtraPayment}
        keyboardType="decimal-pad"
      />
      {early && early.monthsSaved > 0 ? (
        <Text variant="caption" color="primary">
          Se pagares {formatCurrency(extra)} extra agora, terminas {early.monthsSaved} meses mais
          cedo e poupas {formatCurrency(early.interestSaved)} em juros.
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  blockTitle: {
    marginTop: spacing.sm,
  },
});
