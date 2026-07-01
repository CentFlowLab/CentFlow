import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PayCreditCardModal } from '@/components/assets/PayCreditCardModal';
import { Button, Card, Text } from '@/components/ui';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { isCardCredit } from '@/lib/credit/credit-type.utils';
import {
  calculateCreditCardBalance,
  calculateCreditUtilization,
} from '@/lib/domain/financial/credit-cards';
import { sumCreditLiabilities } from '@/lib/domain/financial/liabilities';
import type { Credit } from '@/lib/domain/types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

import { AnalysisExpandableSection } from './AnalysisExpandableSection';

export function AnalysisDebtTab() {
  const { data } = useLiabilities();
  const [payCredit, setPayCredit] = useState<Credit | null>(null);

  const credits = data?.credits ?? [];
  const cards = useMemo(() => credits.filter((c) => isCardCredit(c.creditType)), [credits]);
  const loans = useMemo(() => credits.filter((c) => !isCardCredit(c.creditType)), [credits]);
  const totalDebt = sumCreditLiabilities(credits);

  return (
    <View style={styles.container}>
      <Card variant="elevated" style={styles.summaryCard}>
        <Text variant="caption" color="textMuted">
          Dívida total
        </Text>
        <Text variant="h2">{formatCurrency(totalDebt)}</Text>
        <Text variant="caption" color="textSecondary">
          {cards.length} cartão{cards.length === 1 ? '' : 'ões'} · {loans.length} crédito
          {loans.length === 1 ? '' : 's'}
        </Text>
      </Card>

      <AnalysisExpandableSection title="Cartões de crédito" defaultExpanded>
        {cards.length === 0 ? (
          <Text variant="body" color="textSecondary">
            Sem cartões registados.
          </Text>
        ) : (
          cards.map((card) => (
            <Card key={card.id} variant="outlined" style={styles.debtItem}>
              <View style={styles.debtRow}>
                <Text variant="bodyMedium">{card.name}</Text>
                <Text variant="bodyMedium">{formatCurrency(calculateCreditCardBalance(card))}</Text>
              </View>
              {card.originalAmount ? (
                <Text variant="caption" color="textMuted">
                  Utilização{' '}
                  {formatPercent(calculateCreditUtilization(card) ?? 0, 0, false)} · Limite{' '}
                  {formatCurrency(card.originalAmount)}
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
                label="Pagar cartão"
                variant="secondary"
                size="sm"
                onPress={() => setPayCredit(card)}
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
            <Card key={loan.id} variant="outlined" style={styles.debtItem}>
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
