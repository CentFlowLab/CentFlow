import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  monthKeyToLocalDate,
  monthOf,
  monthsEndingAt,
  netWorthHistory,
  pickPrimaryCurrency,
  type CalendarDate,
} from '@/core/finance';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { BarChart, Card, Section, Text } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

/** Meses mostrados na evolução. */
const MONTHS = 12;

async function loadHistory(repositories: Repositories, today: CalendarDate) {
  const { accounts, flows } = await repositories.accounts.balanceHistory();
  const wealth = await repositories.wealth.list();
  const currency = pickPrimaryCurrency([
    ...accounts.map((account) => account.currency),
    ...wealth.map((item) => item.currency),
  ]);
  const months = monthsEndingAt(monthOf(today), MONTHS);
  return {
    currency,
    points: netWorthHistory({ months, currency, accounts, flows, wealth }),
  };
}

/**
 * "Evolução do património total": contas + bens − dívidas no fim de cada mês (ADR-046). As contas
 * vêm dos movimentos; os bens, das avaliações guardadas. Só mostra os meses com dados.
 */
export function NetWorthHistoryCard({ today }: { today: CalendarDate }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatMoney, locale, formatMonthYear } = useLocaleFormat();
  const query = useDataQuery(
    useCallback((repositories: Repositories) => loadHistory(repositories, today), [today]),
  );
  if (!query.data) return null;
  const { currency, points } = query.data;
  const money = (amountMinor: number, sign = false) =>
    formatMoney({ amountMinor, currency }, sign ? { signDisplay: 'exceptZero' } : undefined);

  const last = points[points.length - 1];
  const first = points[0];
  const canChart = points.length >= 2 && points.every((point) => point.netWorth >= 0);

  return (
    <Section title={t('wealth.history.title')}>
      <Card style={styles.card}>
        {points.length < 2 || !last || !first ? (
          <Text variant="callout" tone="secondary">
            {t('wealth.history.notEnough')}
          </Text>
        ) : (
          <>
            <View style={styles.summary}>
              <Text variant="footnote" tone="secondary">
                {t('wealth.history.current', {
                  month: formatMonthYear(monthKeyToLocalDate(last.month)),
                })}
              </Text>
              <Text variant="title2" tone={last.netWorth < 0 ? 'negative' : 'primary'} tabular>
                {money(last.netWorth)}
              </Text>
              <Text
                variant="footnote"
                tone={last.netWorth - first.netWorth < 0 ? 'negative' : 'positive'}
                tabular>
                {t('wealth.history.change', {
                  amount: money(last.netWorth - first.netWorth, true),
                  since: formatMonthYear(monthKeyToLocalDate(first.month)),
                })}
              </Text>
            </View>
            {canChart ? (
              <BarChart
                seriesColors={[colors.primary]}
                groups={points.map((point) => {
                  const date = monthKeyToLocalDate(point.month);
                  const short = new Intl.DateTimeFormat(locale, { month: 'short' })
                    .format(date)
                    .replace('.', '');
                  return {
                    key: point.month,
                    label: short.charAt(0).toLocaleUpperCase() + short.slice(1),
                    values: [point.netWorth],
                    highlighted: point.month === last.month,
                    accessibilityLabel: t('wealth.history.point', {
                      month: formatMonthYear(date),
                      amount: money(point.netWorth),
                    }),
                  };
                })}
              />
            ) : null}
          </>
        )}
        <Text variant="caption" tone="tertiary">
          {t('wealth.history.explanation', { months: MONTHS })}
        </Text>
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  summary: {
    gap: spacing.xs,
  },
});
