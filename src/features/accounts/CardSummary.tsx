import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { calendarDateToLocalDate, cardStatus, nextMonthlyDate, type Account } from '@/core/finance';
import { useLocaleFormat } from '@/i18n';
import { ProgressBar, Text } from '@/ui/components';
import { spacing } from '@/ui/theme';

/** Dívida, limite, disponível, utilização e próxima data de pagamento de um cartão (ADR-057). */
export function CardSummary({
  account,
  balance,
  today,
  compact = false,
}: {
  account: Pick<Account, 'creditLimit' | 'dueDay' | 'currency'>;
  balance: number;
  today: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { formatMoney, formatPercent, formatDate } = useLocaleFormat();
  const status = cardStatus(account, balance);
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency: account.currency });
  const parts = [t('accounts.cardDebt', { amount: money(status.debt) })];
  if (status.available !== null) {
    parts.push(
      status.overLimit
        ? t('accounts.cardOverLimit', { amount: money(-status.available) })
        : t('accounts.cardAvailable', { amount: money(status.available) }),
    );
  }
  const due =
    account.dueDay !== null
      ? t('accounts.cardNextDue', {
          date: formatDate(
            calendarDateToLocalDate(nextMonthlyDate(account.dueDay, today)),
            'medium',
          ),
        })
      : null;
  return (
    <View style={compact ? styles.compact : styles.full}>
      <Text variant={compact ? 'footnote' : 'callout'} tone="secondary">
        {parts.join(' · ')}
      </Text>
      {status.utilization !== null ? (
        <ProgressBar
          progress={Math.min(1, status.utilization)}
          tone={status.overLimit ? 'negative' : status.utilization >= 0.8 ? 'warning' : 'accent'}
          accessibilityLabel={t('accounts.cardUsage', {
            percent: formatPercent(status.utilization),
          })}
        />
      ) : null}
      {!compact && status.limit !== null ? (
        <Text variant="footnote" tone="tertiary">
          {[
            t('accounts.cardLimit', { amount: money(status.limit) }),
            t('accounts.cardUsage', { percent: formatPercent(status.utilization ?? 0) }),
            due,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : due ? (
        <Text variant="footnote" tone="tertiary">
          {due}
        </Text>
      ) : null}
      {!compact && status.limit !== null ? (
        <Text variant="footnote" tone="tertiary">
          {t('accounts.cardNotMoney')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  full: { gap: spacing.sm },
  compact: { gap: spacing.xs },
});
