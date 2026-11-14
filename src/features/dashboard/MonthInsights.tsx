import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  addMonths,
  buildMonthForecast,
  spendingInsights,
  type AccountType,
  type CalendarDate,
  type ForecastInput,
  type MonthHistory,
  type SpendingInsight,
  bucketDailyTotals,
  financialMonthOf,
  financialMonthRange,
} from '@/core/finance';
import type { CurrencyCode } from '@/core/money';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { Card, Divider, Icon, Section, Text, type IconName } from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

import { useFinanceLookups } from '../finance/useFinanceLookups';
import { useFinancialMonthStartDay } from '../preferences';

/** Contas de uso diário: o dinheiro que se pode gastar este mês (poupanças e investimentos ficam de fora). */
const SPENDABLE: ReadonlySet<AccountType> = new Set(['bank', 'cash', 'card']);

type Totals = Omit<MonthHistory, 'month'>;

function addTo(
  totals: Totals & { byCategory: Map<string, number> },
  row: {
    type: 'income' | 'expense';
    categoryId: string | null;
    amount: number;
  },
) {
  if (row.type === 'income') {
    totals.income += row.amount;
    return;
  }
  totals.expense += row.amount;
  if (row.categoryId) {
    totals.byCategory.set(
      row.categoryId,
      (totals.byCategory.get(row.categoryId) ?? 0) + row.amount,
    );
  }
}

function emptyTotals() {
  return { income: 0, expense: 0, byCategory: new Map<string, number>() };
}

export async function loadForecastInput(
  repositories: Repositories,
  today: CalendarDate,
  currency: CurrencyCode,
  startDay = 1,
): Promise<ForecastInput> {
  // Período financeiro atual e os 3 anteriores completos (ADR-077); dia 1 = meses civis.
  const month = financialMonthOf(today, startDay);
  const accounts = await repositories.accounts.listWithBalances();
  const availableBalance = accounts
    .filter((account) => account.currency === currency && SPENDABLE.has(account.type))
    // Como o "Disponível" do início: a dívida de um cartão não é dinheiro que se gasta este mês.
    .reduce(
      (sum, account) =>
        sum + (account.type === 'card' ? Math.max(0, account.balance) : account.balance),
      0,
    );

  const months = [3, 2, 1].map((back) => addMonths(month, -back));
  const range = {
    from: financialMonthRange(months[0]!, startDay).start,
    to: financialMonthRange(months[2]!, startDay).end,
  };
  const aggregates =
    startDay === 1
      ? await repositories.entries.aggregate(range)
      : bucketDailyTotals(await repositories.entries.aggregateByDate(range), startDay);
  const history = months.map((key) => {
    const totals = emptyTotals();
    for (const row of aggregates) {
      if (row.month === key && row.currency === currency) addTo(totals, row);
    }
    return { month: key, ...totals };
  });

  const monthToDate = emptyTotals();
  const days = await repositories.entries.aggregateByDate({
    from: financialMonthRange(month, startDay).start,
    to: today,
  });
  for (const row of days) if (row.currency === currency) addTo(monthToDate, row);

  const subscriptions = await repositories.subscriptions.list();
  return { today, currency, availableBalance, monthToDate, history, subscriptions, startDay };
}

const INSIGHT_ICONS: Record<
  SpendingInsight['kind'],
  { icon: IconName; tone: 'negative' | 'warning' | 'positive' }
> = {
  endNegative: { icon: 'alert-circle-outline', tone: 'negative' },
  priceRise: { icon: 'pricetag-outline', tone: 'warning' },
  categoryAbove: { icon: 'trending-up', tone: 'warning' },
  spendingBelow: { icon: 'trending-down', tone: 'positive' },
};

/**
 * "Este mês": previsão do saldo no fim do mês, quanto se pode gastar por dia e alertas sobre o
 * ritmo de gastos. Calculado em `core/finance/forecast.ts` só com os dados registados.
 */
export function MonthInsights({
  today,
  currency,
}: {
  today: CalendarDate;
  currency: CurrencyCode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatMoney, formatPercent } = useLocaleFormat();
  const startDay = useFinancialMonthStartDay();
  const lookups = useFinanceLookups();
  const query = useDataQuery(
    useCallback(
      (repositories: Repositories) => loadForecastInput(repositories, today, currency, startDay),
      [today, currency, startDay],
    ),
  );
  if (!query.data) return null;

  const input = query.data;
  const forecast = buildMonthForecast(input);
  const insights = spendingInsights(input, forecast);
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency });
  const signed = (amountMinor: number) =>
    formatMoney({ amountMinor, currency }, { signDisplay: 'exceptZero' });

  const lines: { key: string; label: string; value: string }[] = [
    { key: 'available', label: t('insights.available'), value: money(input.availableBalance) },
  ];
  if (forecast.expectedIncome > 0) {
    lines.push({
      key: 'income',
      label: t('insights.expectedIncome'),
      value: signed(forecast.expectedIncome),
    });
  }
  if (forecast.upcomingTotal > 0) {
    lines.push({
      key: 'subscriptions',
      label: t('insights.upcomingSubscriptions', { count: forecast.upcomingCharges.length }),
      value: signed(-forecast.upcomingTotal),
    });
  }
  if (forecast.projectedSpending > 0) {
    lines.push({
      key: 'spending',
      label: t('insights.projectedSpending', { count: forecast.daysLeft - 1 }),
      value: signed(-forecast.projectedSpending),
    });
  }

  const insightText = (insight: SpendingInsight): string => {
    switch (insight.kind) {
      case 'endNegative':
        return t('insights.endNegative', { amount: money(insight.endBalance) });
      case 'priceRise':
        return t('insights.priceRise', {
          name: insight.name,
          previous: money(insight.previous),
          amount: money(insight.amount),
          yearly: money(insight.yearlyIncrease),
        });
      case 'categoryAbove':
        return t('insights.categoryAbove', {
          category: lookups.data?.categories.get(insight.categoryId)?.name ?? '—',
          spent: money(insight.spent),
          percent: formatPercent(insight.ratio - 1, 0),
          extra: money(insight.monthExtra),
          yearly: money(insight.monthExtra * 12),
        });
      case 'spendingBelow':
        return t('insights.spendingBelow', { percent: formatPercent(1 - insight.ratio, 0) });
    }
  };

  return (
    <Section title={t('insights.title')}>
      <Card style={styles.card}>
        {forecast.endBalance === null ? (
          <View style={styles.block}>
            <Text variant="footnote" tone="secondary">
              {t('insights.endOfMonth')}
            </Text>
            <Text variant="callout" tone="secondary">
              {t('insights.notEnoughData')}
            </Text>
          </View>
        ) : (
          <View style={styles.block}>
            <Text variant="footnote" tone="secondary">
              {t('insights.endOfMonth')}
            </Text>
            <Text
              variant="title1"
              tone={forecast.endBalance < 0 ? 'negative' : 'primary'}
              tabular
              numberOfLines={1}
              adjustsFontSizeToFit>
              {money(forecast.endBalance)}
            </Text>
            <Text variant="caption" tone="tertiary">
              {forecast.basis === 'history'
                ? t('insights.basisHistory', { amount: money(forecast.dailySpend ?? 0) })
                : t('insights.basisMonth', { amount: money(forecast.dailySpend ?? 0) })}
            </Text>
            <View style={styles.lines}>
              {lines.map((line) => (
                <View key={line.key} style={styles.line}>
                  <Text variant="footnote" tone="secondary" style={styles.flex}>
                    {line.label}
                  </Text>
                  <Text variant="footnote" tabular>
                    {line.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Divider />

        <View style={styles.block}>
          <Text variant="footnote" tone="secondary">
            {t('insights.perDay')}
          </Text>
          <Text variant="title2" tabular numberOfLines={1} adjustsFontSizeToFit>
            {money(forecast.dailyAllowance)}
          </Text>
          <Text variant="caption" tone="tertiary">
            {t('insights.perDayHint', { count: forecast.daysLeft })}
          </Text>
        </View>

        {insights.length > 0 ? (
          <>
            <Divider />
            <View style={styles.insights}>
              {insights.map((insight) => {
                const { icon, tone } = INSIGHT_ICONS[insight.kind];
                return (
                  <View
                    key={
                      insight.kind === 'categoryAbove'
                        ? insight.categoryId
                        : insight.kind === 'priceRise'
                          ? insight.subscriptionId
                          : insight.kind
                    }
                    style={styles.insight}
                    accessible>
                    <View
                      style={[
                        styles.insightIcon,
                        { backgroundColor: colors[`${tone}Muted` as const] },
                      ]}>
                      <Icon name={icon} size={16} color={tone} />
                    </View>
                    <Text variant="callout" style={styles.flex}>
                      {insightText(insight)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  block: {
    gap: spacing.xs,
  },
  lines: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  line: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  insights: {
    gap: spacing.md,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
