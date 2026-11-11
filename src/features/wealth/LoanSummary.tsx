import { router } from 'expo-router';
import { Fragment, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  calendarDateToLocalDate,
  liabilityProgress,
  loanState,
  type WealthItem,
} from '@/core/finance';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { Button, Card, Divider, ProgressBar, Text } from '@/ui/components';
import { spacing } from '@/ui/theme';

/**
 * Resumo de um empréstimo (ADR-057): capital inicial, dívida calculada pelas prestações ligadas,
 * capital amortizado, juros e encargos pagos, e cada pagamento com a dívida antes e depois.
 * Dívidas antigas (sem abertura) mostram o progresso pelo histórico, como antes.
 */
export function LoanSummary({ item }: { item: WealthItem }) {
  const { t } = useTranslation();
  const { formatMoney, formatPercent, formatDate } = useLocaleFormat();
  const ledger = useDataQuery(
    useCallback((repositories: Repositories) => repositories.wealth.loanLedger(item.id), [item.id]),
  );
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency: item.currency });
  const day = (value: string) => formatDate(calendarDateToLocalDate(value), 'medium');
  const state = ledger.data ? loanState(item, ledger.data) : null;
  const legacy = state ? null : liabilityProgress(item);

  return (
    <Card padding="md" style={styles.card}>
      {state ? (
        <>
          <View style={styles.figures}>
            {state.original !== null ? (
              <Figure label={t('wealth.loan.original')}>{money(state.original)}</Figure>
            ) : null}
            <Figure label={t('wealth.loan.debt')}>{money(state.debt)}</Figure>
            {state.amortized !== null ? (
              <Figure label={t('wealth.loan.amortized')}>
                {`${money(state.amortized)} · ${formatPercent(state.amortizedRatio ?? 0, 1)}`}
              </Figure>
            ) : null}
          </View>
          {state.amortizedRatio !== null ? (
            <ProgressBar
              progress={state.amortizedRatio}
              tone="positive"
              accessibilityLabel={t('wealth.loan.amortized')}
            />
          ) : null}
          <Text variant="footnote" tone="secondary">
            {[
              t('wealth.loan.interestPaid', { amount: money(state.interestPaid) }),
              t('wealth.loan.feesPaid', { amount: money(state.feesPaid) }),
              item.interestRateBp !== null
                ? t('wealth.loan.rate', { rate: formatPercent(item.interestRateBp / 10000, 2) })
                : null,
              item.installmentAmount !== null
                ? t('wealth.loan.installment', { amount: money(item.installmentAmount) })
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </>
      ) : legacy ? (
        <>
          <Text variant="callout">
            {t('wealth.progress', { paid: money(legacy.paid), original: money(legacy.original) })}
          </Text>
          <ProgressBar
            progress={legacy.ratio}
            tone="positive"
            accessibilityLabel={t('wealth.progress', {
              paid: money(legacy.paid),
              original: money(legacy.original),
            })}
          />
        </>
      ) : null}
      {!item.closedOn ? (
        <Button
          label={t('wealth.pay')}
          icon="cash-outline"
          onPress={() => router.push({ pathname: '/wealth/payment/[id]', params: { id: item.id } })}
        />
      ) : null}
      {state ? (
        <View style={styles.history}>
          <Text variant="label" tone="secondary">
            {t('wealth.loan.history')}
          </Text>
          {state.payments.length === 0 ? (
            <Text variant="footnote" tone="tertiary">
              {t('wealth.loan.noPayments')}
            </Text>
          ) : (
            [...state.payments].reverse().map((line, index) => (
              <Fragment key={line.id}>
                {index > 0 ? <Divider /> : null}
                <View style={styles.line}>
                  <Text variant="bodyStrong">{`${day(line.date)} · ${money(line.total)}`}</Text>
                  <Text variant="footnote" tone="secondary">
                    {t('wealth.loan.split', {
                      principal: money(line.principal),
                      interest: money(line.interest),
                      fees: money(line.fees),
                    })}
                  </Text>
                  <Text variant="footnote" tone="tertiary">
                    {t('wealth.loan.debtLine', {
                      before: money(line.debtBefore),
                      after: money(line.debtAfter),
                    })}
                  </Text>
                </View>
              </Fragment>
            ))
          )}
        </View>
      ) : null}
    </Card>
  );
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.figure}>
      <Text variant="footnote" tone="secondary">
        {label}
      </Text>
      <Text variant="bodyStrong" tabular>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  figures: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  figure: { gap: spacing.xs, minWidth: 110 },
  history: { gap: spacing.sm },
  line: { gap: 2, paddingVertical: spacing.xs },
});
