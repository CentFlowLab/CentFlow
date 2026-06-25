import { Pressable, StyleSheet, View } from 'react-native';

import { AssetsEmptyState } from '@/components/assets/AssetsEmptyState';
import { SwipeableAssetRow } from '@/components/assets/SwipeableAssetRow';
import { Button, Card, Text } from '@/components/ui';
import type { Credit } from '@/lib/domain/types';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

type CreditsSectionProps = {
  credits: Credit[];
  onCreate?: () => void;
  onEdit?: (credit: Credit) => void;
  onLearnMore?: () => void;
  onDelete?: (credit: Credit) => void;
  onRegisterPayment?: (credit: Credit) => void;
};

/** Percentagem amortizada (0–1) com base no montante original. */
function getRepaidProgress(credit: Credit): number | null {
  if (!credit.originalAmount || credit.originalAmount <= 0) return null;
  const repaid = credit.originalAmount - credit.outstandingBalance;
  if (repaid <= 0) return 0;
  return Math.min(1, repaid / credit.originalAmount);
}

export function CreditsSection({
  credits,
  onCreate,
  onEdit,
  onLearnMore,
  onDelete,
  onRegisterPayment,
}: CreditsSectionProps) {
  if (credits.length === 0) {
    return (
      <View style={styles.container}>
        <AssetsEmptyState
          config={{
            icon: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
            title: 'Simula e regista créditos',
            description:
              'Adiciona um crédito para controlar dívida, próximos pagamentos e esforço financeiro.',
            actionLabel: 'Novo crédito',
            secondaryActionLabel: 'Como funciona',
            highlights: [
              'Simulador com taxa de esforço',
              'Próximos pagamentos em destaque',
              'Integrado no teu património',
            ],
          }}
          onPrimaryAction={onCreate}
          onSecondaryAction={onLearnMore}
        />
      </View>
    );
  }

  const totalDebt = credits.reduce((sum, credit) => sum + credit.outstandingBalance, 0);

  return (
    <View style={styles.container}>
      <Card variant="outlined" style={styles.summaryCard}>
        <Text variant="caption" color="textMuted">
          Total em dívida
        </Text>
        <Text variant="h3" color="danger">
          {formatCurrency(totalDebt)}
        </Text>
      </Card>

      <View style={styles.list}>
        {credits.map((credit) => (
          <SwipeableAssetRow
            key={credit.id}
            label={credit.name}
            onDelete={() => onDelete?.(credit)}>
            <Pressable onPress={() => onEdit?.(credit)} disabled={!onEdit}>
              <Card variant="elevated" style={styles.itemCard}>
                <Text variant="bodyMedium">{credit.name}</Text>
                <Text variant="caption" color="textMuted">
                  Saldo: {formatCurrency(credit.outstandingBalance)}
                </Text>
                {(() => {
                  const progress = getRepaidProgress(credit);
                  if (progress === null) return null;
                  return (
                    <View style={styles.progressBlock}>
                      <View style={styles.progressTrack}>
                        <View
                          style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}
                        />
                      </View>
                      <Text variant="caption" color="textSecondary">
                        {Math.round(progress * 100)}% pago de{' '}
                        {formatCurrency(credit.originalAmount!)}
                      </Text>
                    </View>
                  );
                })()}
                {credit.interestRateAnnual !== undefined ? (
                  <Text variant="caption" color="textSecondary">
                    TAEG: {credit.interestRateAnnual.toFixed(2)}%
                  </Text>
                ) : null}
                {credit.nextPaymentDate || credit.nextPaymentAmount ? (
                  <Text variant="caption" color="textSecondary">
                    Próximo:{' '}
                    {credit.nextPaymentAmount ? formatCurrency(credit.nextPaymentAmount) : '—'}
                    {credit.nextPaymentDate ? ` · ${formatDateShort(credit.nextPaymentDate)}` : ''}
                  </Text>
                ) : null}
                {onRegisterPayment ? (
                  <Button
                    label="Registar pagamento"
                    variant="secondary"
                    size="sm"
                    onPress={() => onRegisterPayment(credit)}
                    style={styles.payButton}
                  />
                ) : null}
              </Card>
            </Pressable>
          </SwipeableAssetRow>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  summaryCard: {
    gap: spacing.xs,
    borderColor: colors.border,
  },
  list: {
    gap: spacing.sm,
  },
  itemCard: {
    gap: spacing.xs,
  },
  progressBlock: {
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  payButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
});
