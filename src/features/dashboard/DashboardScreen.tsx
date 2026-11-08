import { router } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  addMonths,
  buildMonthlyOverview,
  monthKeyToLocalDate,
  monthOf,
  monthRange,
  pickPrimaryCurrency,
  totalsByCurrency,
  type MonthKey,
} from '@/core/finance';
import { getDayPart } from '@/core/format';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  BarChart,
  Button,
  Card,
  CategoryIcon,
  Divider,
  EmptyState,
  IconButton,
  Screen,
  Section,
  Text,
} from '@/ui/components';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { categorySwatch, radius, spacing, useTheme } from '@/ui/theme';

import { EntryListItem } from '../finance/EntryListItem';
import { useFinanceLookups } from '../finance/useFinanceLookups';
import { useToday } from '../finance/useToday';
import { NEW_TRANSACTION_HREF } from '../navigation/nav-items';

const TREND_MONTHS = 6;
const LATEST_COUNT = 5;
const DIVIDER_INSET = spacing.lg + 36 + spacing.md;

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

async function loadDashboard(repositories: Repositories, month: MonthKey) {
  const { start, end } = monthRange(month);
  const accounts = await repositories.accounts.listWithBalances();
  const aggregates = await repositories.entries.aggregate({
    from: monthRange(addMonths(month, -(TREND_MONTHS - 1))).start,
    to: end,
  });
  const latest = await repositories.entries.list({ from: start, to: end, limit: LATEST_COUNT });
  return { accounts, aggregates, latest };
}

export function DashboardScreen() {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const breakpoint = useBreakpoint();
  const { formatDate, formatMoney, formatMonthYear, formatPercent, locale } = useLocaleFormat();
  const today = useToday();
  const currentMonth = monthOf(today);
  const [month, setMonth] = useState<MonthKey>(currentMonth);
  const lookups = useFinanceLookups();
  const query = useDataQuery(
    useCallback((repositories: Repositories) => loadDashboard(repositories, month), [month]),
  );
  const now = new Date();

  const header = {
    title: t(`dashboard.greeting.${getDayPart(now)}`),
    subtitle: capitalize(formatDate(now, 'long')),
  };

  if (!query.data || !lookups.data) {
    return (
      <Screen {...header}>
        {query.status === 'error' ? (
          <EmptyState icon="alert-circle-outline" title={t('errors.loadFailed')} />
        ) : (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        )}
      </Screen>
    );
  }

  const { accounts, aggregates, latest } = query.data;
  const lookupData = lookups.data;

  if (accounts.length === 0) {
    return (
      <Screen {...header}>
        <Card padding="none">
          <EmptyState
            icon="wallet-outline"
            title={t('dashboard.onboardingTitle')}
            description={t('dashboard.onboardingDescription')}>
            <Button
              label={t('dashboard.createAccount')}
              icon="add"
              onPress={() => router.push('/account/new')}
            />
          </EmptyState>
        </Card>
      </Screen>
    );
  }

  const currency = pickPrimaryCurrency(accounts.map((account) => account.currency));
  const totals = totalsByCurrency(
    accounts.map((account) => ({
      accountId: account.id,
      currency: account.currency,
      balance: account.balance,
    })),
  );
  const otherCurrencies = [...totals.entries()]
    .filter(([code]) => code !== currency)
    .map(([code, amount]) => formatMoney({ amountMinor: amount, currency: code }));
  const overview = buildMonthlyOverview(aggregates, { month, currency, trendLength: TREND_MONTHS });
  const { summary } = overview;
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency });
  const monthLabel = capitalize(formatMonthYear(monthKeyToLocalDate(month)));
  const isWide = breakpoint !== 'compact';

  const kpis = [
    {
      key: 'income',
      label: t('dashboard.monthIncome'),
      value: money(summary.income),
      tone: 'positive' as const,
    },
    {
      key: 'expense',
      label: t('dashboard.monthExpenses'),
      value: money(summary.expense),
      tone: 'primary' as const,
    },
    {
      key: 'net',
      label: t('dashboard.netSavings'),
      value: formatMoney({ amountMinor: summary.net, currency }, { signDisplay: 'exceptZero' }),
      tone: summary.net < 0 ? ('negative' as const) : ('primary' as const),
    },
    {
      key: 'rate',
      label: t('dashboard.savingsRate'),
      value: summary.savingsRate === null ? '—' : formatPercent(summary.savingsRate, 1),
      hint: summary.savingsRate === null ? t('dashboard.savingsRateUndefined') : undefined,
      tone:
        summary.savingsRate !== null && summary.savingsRate < 0
          ? ('negative' as const)
          : ('primary' as const),
    },
  ];

  const categoryBreakdown = (
    <Section title={t('dashboard.expensesByCategory')}>
      <Card style={styles.cardGap}>
        {overview.categories.length === 0 ? (
          <Text variant="callout" tone="secondary">
            {t('dashboard.noExpenses')}
          </Text>
        ) : (
          overview.categories.map((item) => {
            const category = lookupData.categories.get(item.categoryId);
            const swatch = categorySwatch(category?.color ?? 'slate', scheme);
            const percent = formatPercent(item.share, 0);
            return (
              <View
                key={item.categoryId}
                accessible
                accessibilityLabel={`${category?.name ?? '—'}: ${money(item.amount)}, ${percent}`}
                style={styles.categoryRow}>
                <CategoryIcon
                  icon={category?.icon ?? 'help-outline'}
                  color={category?.color ?? 'slate'}
                  size={32}
                />
                <View style={styles.categoryBody}>
                  <View style={styles.categoryLine}>
                    <Text variant="label" numberOfLines={1} style={styles.flex}>
                      {category?.name ?? '—'}
                    </Text>
                    <Text variant="label" tabular>
                      {money(item.amount)}
                    </Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width: `${Math.max(item.share * 100, 2)}%`,
                          backgroundColor: swatch.foreground,
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text variant="caption" tone="tertiary" tabular style={styles.percent}>
                  {percent}
                </Text>
              </View>
            );
          })
        )}
      </Card>
    </Section>
  );

  const trend = (
    <Section title={t('dashboard.monthlyTrend')}>
      <Card style={styles.cardGap}>
        <BarChart
          seriesColors={[colors.positive, colors.negative]}
          groups={overview.trend.map((item) => {
            const date = monthKeyToLocalDate(item.month);
            const short = new Intl.DateTimeFormat(locale, { month: 'short' })
              .format(date)
              .replace('.', '');
            return {
              key: item.month,
              label: capitalize(short),
              values: [item.income, item.expense],
              highlighted: item.month === month,
              accessibilityLabel: t('dashboard.trendSummary', {
                month: formatMonthYear(date),
                income: money(item.income),
                expenses: money(item.expense),
              }),
            };
          })}
        />
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.positive }]} />
            <Text variant="caption" tone="secondary">
              {t('dashboard.monthIncome')}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.negative }]} />
            <Text variant="caption" tone="secondary">
              {t('dashboard.monthExpenses')}
            </Text>
          </View>
        </View>
      </Card>
    </Section>
  );

  return (
    <Screen {...header}>
      <View style={styles.monthBar}>
        <IconButton
          icon="chevron-back"
          variant="filled"
          accessibilityLabel={t('dashboard.previousMonth')}
          onPress={() => setMonth((value) => addMonths(value, -1))}
        />
        <Text variant="title3" align="center" style={styles.flex} accessibilityLiveRegion="polite">
          {monthLabel}
        </Text>
        <IconButton
          icon="chevron-forward"
          variant="filled"
          accessibilityLabel={t('dashboard.nextMonth')}
          onPress={() => setMonth((value) => addMonths(value, 1))}
        />
      </View>
      {month !== currentMonth ? (
        <View style={styles.center}>
          <Button
            label={t('dashboard.backToCurrentMonth')}
            variant="ghost"
            size="sm"
            icon="today-outline"
            onPress={() => setMonth(currentMonth)}
          />
        </View>
      ) : null}

      <Card style={styles.hero}>
        <Text variant="footnote" tone="secondary">
          {t('dashboard.totalBalance')}
        </Text>
        <Text variant="amountHero" tabular numberOfLines={1} adjustsFontSizeToFit>
          {money(totals.get(currency) ?? 0)}
        </Text>
        <Text variant="caption" tone="tertiary">
          {t('dashboard.totalBalanceHint', { currency })}
        </Text>
        {otherCurrencies.length > 0 ? (
          <Text variant="caption" tone="tertiary">
            {t('dashboard.otherCurrencies', { list: otherCurrencies.join(' · ') })}
          </Text>
        ) : null}
      </Card>

      <View style={styles.kpis}>
        {kpis.map((kpi) => (
          <Card key={kpi.key} style={[styles.kpi, { flexBasis: isWide ? 200 : 150 }]}>
            <Text variant="footnote" tone="secondary" numberOfLines={1}>
              {kpi.label}
            </Text>
            <Text variant="title3" tone={kpi.tone} tabular numberOfLines={1} adjustsFontSizeToFit>
              {kpi.value}
            </Text>
            {kpi.hint ? (
              <Text variant="caption" tone="tertiary" numberOfLines={2}>
                {kpi.hint}
              </Text>
            ) : null}
          </Card>
        ))}
      </View>

      {breakpoint === 'expanded' ? (
        <View style={styles.columns}>
          <View style={styles.flex}>{categoryBreakdown}</View>
          <View style={styles.flex}>{trend}</View>
        </View>
      ) : (
        <>
          {categoryBreakdown}
          {trend}
        </>
      )}

      <Section
        title={t('dashboard.latestEntries')}
        action={
          latest.total > 0 ? (
            <Button
              label={t('dashboard.seeAll')}
              variant="ghost"
              size="sm"
              onPress={() => router.navigate('/transactions')}
            />
          ) : undefined
        }>
        <Card padding="xs">
          {latest.items.length === 0 ? (
            <EmptyState icon="receipt-outline" title={t('dashboard.noEntries')}>
              <Button
                label={t('dashboard.addEntry')}
                icon="add"
                onPress={() => router.push(NEW_TRANSACTION_HREF)}
              />
            </EmptyState>
          ) : (
            latest.items.map((entry, index) => (
              <Fragment key={entry.id}>
                {index > 0 ? <Divider inset={DIVIDER_INSET} /> : null}
                <EntryListItem
                  entry={entry}
                  lookups={lookupData}
                  onPress={() => router.push({ pathname: '/entry/[id]', params: { id: entry.id } })}
                />
              </Fragment>
            ))
          )}
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: spacing['4xl'],
  },
  flex: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    marginTop: -spacing.lg,
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  hero: {
    gap: spacing.xs,
  },
  kpis: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  kpi: {
    flexGrow: 1,
    gap: spacing.xs,
  },
  columns: {
    flexDirection: 'row',
    gap: spacing['2xl'],
    alignItems: 'flex-start',
  },
  cardGap: {
    gap: spacing.lg,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  categoryBody: {
    flex: 1,
    gap: spacing.xs + 2,
  },
  categoryLine: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  track: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  percent: {
    width: 40,
    textAlign: 'right',
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
});
