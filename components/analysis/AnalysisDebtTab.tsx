import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PayCreditCardModal } from '@/components/assets/PayCreditCardModal';
import { Button, Card, Text } from '@/components/ui';
import { useFinancialEngineSnapshot } from '@/hooks/useFinancialEngineSnapshot';
import {
  selectCreditCardDebts,
  selectDebtSummary,
  selectLoanDebts,
} from '@/lib/domain/financial/engine.selectors';
import type { Credit } from '@/lib/domain/types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

import { AnalysisExpandableSection } from './AnalysisExpandableSection';

export function AnalysisDebtTab() {
  const { coreState, isLoading } = useFinancialEngineSnapshot();
  const [payCredit, setPayCredit] = useState<Credit | null>(null);

  const debtSummary = useMemo(
    () => (coreState ? selectDebtSummary(coreState) : null),
    [coreState],
  );
  const cards = useMemo(
    () => (coreState ? selectCreditCardDebts(coreState) : []),
    [coreState],
  );
  const loans = useMemo(
    () => (coreState ? selectLoanDebts(coreState) : []),
    [coreState],
  );

  if (isLoading || !debtSummary) {
    return (
      <View style={styles.container}>
        <Text variant="body" color="textSecondary">
          A carregar dívida...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card variant="elevated" style={styles.summaryCard}>
        <Text variant="caption" color="textMuted">
          Dívida total
        </Text>
        <Text variant="h2">{formatCurrency(debtSummary.totalDebt)}</Text>
        <Text variant="caption" color="textSecondary">
          {debtSummary.cardCount} cartão{debtSummary.cardCount === 1 ? '' : 'ões'} ·{' '}
          {debtSummary.loanCount} crédito{debtSummary.loanCount === 1 ? '' : 's'}
        </Text>
      </Card>

      <AnalysisExpandableSection title="Cartões de crédito" defaultExpanded>
        {cards.length === 0 ? (
          <Text variant="body" color="textSecondary">
            Sem cartões registados.
          </Text>
        ) : (
          cards.map((card) => (
            <Card key={card.creditId} variant="outlined" style={styles.debtItem}>
              <View style={styles.debtRow}>
                <Text variant="bodyMedium">{card.name}</Text>
                <Text variant="bodyMedium">{formatCurrency(card.debt)}</Text>
              </View>
              {card.limit != null ? (
                <Text variant="caption" color="textMuted">
                  Utilização {formatPercent(card.utilizationPercent ?? 0, 0, false)} · Limite{' '}
                  {formatCurrency(card.limit)}
                </Text>
              ) : null}
              {card.nextPaymentDate ? (
                <Text variant="caption" color="textSecondary">
                  Próximo vencimento: {card.nextPaymentDate}
                  {card.nextPaymentAmount
                    ? ` · ${formatCurrency(card.nextPaymentAmount)}`
                    : ''}
                </Text>
              ) : null}
              <Button
                label="Registar pagamento"
                variant="secondary"
                size="sm"
                onPress={() =>
                  setPayCredit(
                    coreState?.credits.find((c) => c.id === card.creditId) ?? null,
                  )
                }
                style={styles.payButton}
              />
            </Card>
          ))
        )}
      </AnalysisExpandableSection>

      <AnalysisExpandableSection title="Créditos" subtitle="Habitação, pessoal e outros">
        {loans.length === 0 ? (
          <Text variant="body" color="textSecondary">
            Sem créditos registados.
          </Text>
        ) : (
          loans.map((loan) => (
            <Card key={loan.creditId} variant="outlined" style={styles.debtItem}>
              <View style={styles.debtRow}>
                <Text variant="bodyMedium">{loan.name}</Text>
                <Text variant="bodyMedium">{formatCurrency(loan.outstandingBalance)}</Text>
              </View>
              {loan.nextPaymentDate ? (
                <Text variant="caption" color="textSecondary">
                  Próximo pagamento: {loan.nextPaymentDate}
                  {loan.nextPaymentAmount ? ` · ${formatCurrency(loan.nextPaymentAmount)}` : ''}
                </Text>
              ) : null}
            </Card>
          ))
        )}
      </AnalysisExpandableSection>

      <PayCreditCardModal
        visible={payCredit !== null}
        credit={payCredit}
        onClose={() => setPayCredit(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  summaryCard: {
    gap: spacing.xs,
  },
  debtItem: {
    gap: spacing.xs,
  },
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
});
