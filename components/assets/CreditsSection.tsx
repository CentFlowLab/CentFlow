import { Pressable, StyleSheet, View } from 'react-native';

import { AssetsEmptyState } from '@/components/assets/AssetsEmptyState';
import { SwipeableAssetRow } from '@/components/assets/SwipeableAssetRow';
import { Button, Card, Text } from '@/components/ui';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import type { Credit } from '@/lib/domain/types';
import { getPersonalizedCreditsEmptyCopy } from '@/lib/onboarding/personalization';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

type CreditsSectionProps = {
  credits: Credit[];
  onCreate?: () => void;
  onEdit?: (credit: Credit) => void;
  onLearnMore?: () => void;
  onDelete?: (credit: Credit) => void;
  onRegisterPayment?: (credit: Credit) => void;
  /** 'card' apresenta os itens como cartões de crédito (limite + utilização). */
  variant?: 'loan' | 'card';
};

/** Percentagem amortizada (0–1) com base no montante original. */
function getRepaidProgress(credit: Credit): number | null {
  if (!credit.originalAmount || credit.originalAmount <= 0) return null;
  const repaid = credit.originalAmount - credit.outstandingBalance;
  if (repaid <= 0) return 0;
  return Math.min(1, repaid / credit.originalAmount);
}

/** Percentagem de utilização do cartão (saldo / limite). */
function getUsageProgress(credit: Credit): number | null {
  if (!credit.originalAmount || credit.originalAmount <= 0) return null;
  return Math.min(1, Math.max(0, credit.outstandingBalance / credit.originalAmount));
}

export function CreditsSection({
  credits,
  onCreate,
  onEdit,
  onLearnMore,
  onDelete,
  onRegisterPayment,
  variant = 'loan',
}: CreditsSectionProps) {
  const isCardVariant = variant === 'card';
  const { data: answers } = useOnboardingAnswers();
  const personalized = getPersonalizedCreditsEmptyCopy(answers ?? null, variant);

  if (credits.length === 0) {
    const baseConfig = isCardVariant
      ? {
          icon: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' } as const,
          title: 'Adiciona os teus cartões',
          description:
            'Regista os teus cartões de crédito para acompanhar saldo, limite e datas de pagamento.',
          actionLabel: 'Novo cartão',
          highlights: [
            'Saldo em dívida vs limite',
            'Barra de utilização',
            'Lembrete da data de vencimento',
          ],
        }
      : {
          icon: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' } as const,
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
        };

    return (
      <View style={styles.container}>
        <AssetsEmptyState
          config={{
            ...baseConfig,
            title: personalized.title || baseConfig.title,
            description: personalized.description || baseConfig.description,
            actionLabel: personalized.actionLabel || baseConfig.actionLabel,
          }}
          onPrimaryAction={onCreate}
          onSecondaryAction={isCardVariant ? undefined : onLearnMore}
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
                {isCardVariant ? (
                  <>
                    {credit.lender ? (
                      <Text variant="caption" color="textMuted">
                        {credit.lender}
                      </Text>
                    ) : null}
                    <Text variant="caption" color="textSecondary">
                      Saldo: {formatCurrency(credit.outstandingBalance)}
                      {credit.originalAmount
                        ? `  /  Limite: ${formatCurrency(credit.originalAmount)}`
                        : ''}
                    </Text>
                    {(() => {
                      const usage = getUsageProgress(credit);
                      if (usage === null) return null;
                      return (
                        <View style={styles.progressBlock}>
                          <View style={styles.progressTrack}>
                            <View
                              style={[
                                styles.progressFill,
                                usage >= 0.8 && styles.progressFillHigh,
                                { width: `${Math.round(usage * 100)}%` },
                              ]}
                            />
                          </View>
                          <Text variant="caption" color="textSecondary">
                            {Math.round(usage * 100)}% do limite utilizado
                          </Text>
                        </View>
                      );
                    })()}
                    {credit.nextPaymentDate ? (
                      <Text variant="caption" color="textSecondary">
                        Vencimento: {formatDateShort(credit.nextPaymentDate)}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <>
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
                  </>
                )}
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
  progressFillHigh: {
    backgroundColor: colors.danger,
  },
  payButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
});
