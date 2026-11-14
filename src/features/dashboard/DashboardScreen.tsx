import { router, type Href } from 'expo-router';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import {
  addMonths,
  buildMonthlyOverview,
  monthKeyToLocalDate,
  resolvePrimaryCurrency,
  referenceForMonth,
  totalsByCurrency,
  type MonthKey,
  bucketDailyTotals,
  financialMonthOf,
  financialMonthRange,
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
  HeroCard,
  Icon,
  Screen,
  Section,
  Text,
  type IconName,
  IconButton,
} from '@/ui/components';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { categorySwatch, radius, spacing, useTheme } from '@/ui/theme';

import { BudgetSummary } from '../budgets/BudgetSummary';
import { EntryListItem } from '../finance/EntryListItem';
import { useFinanceLookups } from '../finance/useFinanceLookups';
import { useToday } from '../finance/useToday';
import { NEW_TRANSACTION_HREF } from '../navigation/nav-items';
import { useSync } from '../account/SyncProvider';
import { markOnboardingOpened, onboardingOpenedThisSession } from '../onboarding/onboarding-state';
import { useOnboarding } from '../onboarding/useOnboarding';
import { FinancialHealthCard } from './FinancialHealthCard';
import { NetWorthCard } from './NetWorthCard';
import { InvestmentsCard } from '../investments/InvestmentsCard';
import { MonthInsights } from './MonthInsights';
import { UpcomingObligations } from './UpcomingObligations';
import { MonthSwitcher } from '../finance/MonthSwitcher';
import { useFinancialMonthStartDay, usePreferences } from '../preferences';

const TREND_MONTHS = 6;
const LATEST_COUNT = 5;
const DIVIDER_INSET = spacing.lg + 36 + spacing.md;

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

/**
 * Período e tendência do Início. Com o mês financeiro (ADR-077) os totais vêm dos totais por dia
 * agrupados no core; com o dia 1 continua a ser a consulta mensal de sempre (os mesmos números).
 */
export async function loadDashboard(repositories: Repositories, month: MonthKey, startDay = 1) {
  const { start, end } = financialMonthRange(month, startDay);
  const from = financialMonthRange(addMonths(month, -(TREND_MONTHS - 1)), startDay).start;
  const accounts = await repositories.accounts.listWithBalances();
  const aggregates =
    startDay === 1
      ? await repositories.entries.aggregate({ from, to: end })
      : bucketDailyTotals(await repositories.entries.aggregateByDate({ from, to: end }), startDay);
  const latest = await repositories.entries.list({ from: start, to: end, limit: LATEST_COUNT });
  return { accounts, aggregates, latest };
}

export function DashboardScreen() {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = usePreferences();
  const { colors, scheme } = useTheme();
  const breakpoint = useBreakpoint();
  const { formatDate, formatMoney, formatMonthYear, formatPercent, locale } = useLocaleFormat();
  const today = useToday();
  const startDay = useFinancialMonthStartDay();
  const currentMonth = financialMonthOf(today, startDay);
  const [month, setMonth] = useState<MonthKey>(currentMonth);
  const lookups = useFinanceLookups();
  const query = useDataQuery(
    useCallback(
      (repositories: Repositories) => loadDashboard(repositories, month, startDay),
      [month, startDay],
    ),
  );
  const now = new Date();
  const noAccounts = query.data?.accounts.length === 0;

  // Onboarding por conta (ADR-067): só quando o servidor confirma que esta conta ainda não o fez
  // e os dados já foram descarregados. Na dúvida (a carregar, primeira sincronização), espera.
  const { decision, syncedOnce, key: onboardingKey } = useOnboarding();
  const { snapshot: syncSnapshot } = useSync();
  useEffect(() => {
    // Uma vez por abertura da app (se a pessoa sair a meio, volta a ser proposto na próxima).
    if (decision !== 'needed' || onboardingOpenedThisSession(onboardingKey)) return;
    markOnboardingOpened(onboardingKey);
    router.push('/onboarding' as Href);
  }, [decision, onboardingKey]);
  // Sem contas e sem certeza ainda: um indicador em vez do ecrã de boas-vindas (sem "piscar").
  // Sem rede ou com erro de sincronização, mostra o ecrã normal (nunca fica preso a esperar).
  // Aparelho novo: espera pela primeira sincronização antes de mostrar "sem contas" (os dados
  // desta conta ainda podem estar a chegar). Depois disso, ou sem rede, mostra o estado real.
  const waitingForAccount =
    noAccounts &&
    decision === 'unknown' &&
    !syncedOnce &&
    syncSnapshot?.status !== 'offline' &&
    syncSnapshot?.status !== 'error';

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

  if (waitingForAccount) {
    return (
      <Screen {...header}>
        <ActivityIndicator
          color={colors.primary}
          style={styles.waiting}
          accessibilityLabel={t('common.loading')}
        />
      </Screen>
    );
  }

  if (accounts.length === 0) {
    const welcomeSteps = t('dashboard.welcomeSteps', {
      returnObjects: true,
    }) as unknown as string[];
    return (
      <Screen {...header}>
        <HeroCard style={styles.welcome}>
          <View style={[styles.welcomeIcon, { backgroundColor: colors.heroSurface }]}>
            <Icon name="wallet-outline" size={28} color="heroText" />
          </View>
          <Text variant="title2" tone="hero">
            {t('dashboard.onboardingTitle')}
          </Text>
          <Text variant="callout" tone="heroMuted">
            {t('dashboard.onboardingDescription')}
          </Text>
          <View style={styles.steps}>
            {welcomeSteps.map((step, index) => (
              <View key={step} style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: colors.heroSurface }]}>
                  <Text variant="caption" tone="hero">
                    {index + 1}
                  </Text>
                </View>
                <Text variant="callout" tone="hero" style={styles.flex}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.createAccount')}
            onPress={() => router.push('/account/new')}
            style={({ pressed }) => [
              styles.welcomeButton,
              { backgroundColor: colors.heroText, opacity: pressed ? 0.85 : 1 },
            ]}>
            <Icon name="add" size={20} color="heroStart" />
            <Text variant="bodyStrong" style={{ color: colors.heroStart }}>
              {t('dashboard.createAccount')}
            </Text>
          </Pressable>
        </HeroCard>
        {/* Investimentos ligados contam mesmo antes de haver contas bancárias. */}
        <InvestmentsCard />
      </Screen>
    );
  }

  const currency = resolvePrimaryCurrency(
    preferences.primaryCurrency,
    accounts.map((account) => account.currency),
  );
  // Disponível: o saldo dos cartões de crédito é dívida, não dinheiro (salvo se estiver a favor).
  const totals = totalsByCurrency(
    accounts.map((account) => ({
      accountId: account.id,
      currency: account.currency,
      balance: account.type === 'card' ? Math.max(0, account.balance) : account.balance,
    })),
  );
  const cardDebt = accounts
    .filter((account) => account.type === 'card' && account.currency === currency)
    .reduce((sum, account) => sum + Math.max(0, -account.balance), 0);
  const otherCurrencies = [...totals.entries()]
    .filter(([code]) => code !== currency)
    .map(([code, amount]) => formatMoney({ amountMinor: amount, currency: code }));
  const overview = buildMonthlyOverview(aggregates, { month, currency, trendLength: TREND_MONTHS });
  const { summary } = overview;
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency });
  const isWide = breakpoint !== 'compact';

  const summaryCards = [
    {
      key: 'income',
      label: t('dashboard.monthIncome'),
      value: money(summary.income),
      tone: 'positive' as const,
      icon: 'arrow-down' as IconName,
      background: colors.positiveMuted,
    },
    {
      key: 'expense',
      label: t('dashboard.monthExpenses'),
      value: money(summary.expense),
      tone: 'negative' as const,
      icon: 'arrow-up' as IconName,
      background: colors.negativeMuted,
    },
  ];
  const quickActions: readonly {
    key: string;
    label: string;
    icon: IconName;
    href: '/new-transaction' | '/accounts' | '/categories';
  }[] = [
    {
      key: 'add',
      label: t('dashboard.addEntry'),
      icon: 'add',
      href: NEW_TRANSACTION_HREF,
    },
    { key: 'accounts', label: t('nav.accounts'), icon: 'wallet-outline', href: '/accounts' },
    {
      key: 'categories',
      label: t('nav.categories'),
      icon: 'pricetags-outline',
      href: '/categories',
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
      <MonthSwitcher
        month={month}
        currentMonth={currentMonth}
        startDay={startDay}
        onChange={setMonth}
      />
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

      <HeroCard style={styles.hero}>
        <View style={styles.heroHead}>
          <Text variant="overline" tone="heroMuted" style={styles.heroTitle}>
            {t('dashboard.totalBalance')}
          </Text>
          <IconButton
            icon={preferences.discreetAmounts ? 'eye-off-outline' : 'eye-outline'}
            color="heroTextMuted"
            accessibilityLabel={
              preferences.discreetAmounts ? t('privacy.showValues') : t('privacy.hideValues')
            }
            onPress={() => updatePreferences({ discreetAmounts: !preferences.discreetAmounts })}
          />
        </View>
        <Text variant="amountHero" tone="hero" tabular numberOfLines={1} adjustsFontSizeToFit>
          {money(totals.get(currency) ?? 0)}
        </Text>
        <View style={styles.heroRow}>
          <View style={[styles.netChip, { backgroundColor: colors.heroSurface }]}>
            <Icon
              name={summary.net < 0 ? 'trending-down' : 'trending-up'}
              size={16}
              color={summary.net < 0 ? 'heroNegative' : 'heroPositive'}
            />
            <Text
              variant="footnote"
              tone={summary.net < 0 ? 'heroNegative' : 'heroPositive'}
              tabular>
              {formatMoney({ amountMinor: summary.net, currency }, { signDisplay: 'exceptZero' })}
            </Text>
          </View>
          {summary.savingsRate === null ? (
            <Text variant="caption" tone="heroMuted" style={styles.flex}>
              {t('dashboard.savingsRateUndefined')}
            </Text>
          ) : (
            <View style={styles.rate}>
              <Text
                variant="footnote"
                tone={summary.savingsRate < 0 ? 'heroNegative' : 'heroPositive'}
                tabular>
                {formatPercent(summary.savingsRate, 1)}
              </Text>
              <Text variant="caption" tone="heroMuted">
                {t('dashboard.savingsRate')}
              </Text>
            </View>
          )}
        </View>
        {summary.savingsRate !== null ? (
          <View style={[styles.rateTrack, { backgroundColor: colors.heroTrack }]}>
            <View
              style={[
                styles.rateFill,
                {
                  width: `${Math.min(Math.max(summary.savingsRate, 0), 1) * 100}%`,
                  backgroundColor:
                    summary.savingsRate < 0 ? colors.heroNegative : colors.heroPositive,
                },
              ]}
            />
          </View>
        ) : null}
        <Text variant="caption" tone="heroMuted">
          {t('dashboard.totalBalanceHint', { currency })}
        </Text>
        {cardDebt > 0 ? (
          <Text variant="caption" tone="heroMuted">
            {t('dashboard.cardDebtHint', { amount: money(cardDebt) })}
          </Text>
        ) : null}
        {otherCurrencies.length > 0 ? (
          <Text variant="caption" tone="heroMuted">
            {t('dashboard.otherCurrencies', { list: otherCurrencies.join(' · ') })}
          </Text>
        ) : null}
      </HeroCard>

      <View style={styles.kpis}>
        {summaryCards.map((kpi) => (
          <Card key={kpi.key} style={[styles.kpi, { flexBasis: isWide ? 240 : 140 }]}>
            <View style={[styles.kpiIcon, { backgroundColor: kpi.background }]}>
              <Icon name={kpi.icon} size={18} color={kpi.tone} />
            </View>
            <Text variant="footnote" tone="secondary" numberOfLines={1}>
              {kpi.label}
            </Text>
            <Text variant="title2" tone={kpi.tone} tabular numberOfLines={1} adjustsFontSizeToFit>
              {kpi.value}
            </Text>
          </Card>
        ))}
      </View>
      <Text variant="caption" tone="tertiary">
        {t('dashboard.transfersExcluded')}
      </Text>

      {month === currentMonth ? <MonthInsights today={today} currency={currency} /> : null}

      {month === currentMonth ? <UpcomingObligations today={today} /> : null}

      {month === currentMonth ? <NetWorthCard currency={currency} /> : null}

      {month === currentMonth ? <InvestmentsCard /> : null}

      <View style={styles.actions}>
        {quickActions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => router.push(action.href)}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: pressed ? colors.surfaceHover : colors.surface,
                borderColor: colors.border,
              },
            ]}>
            <View style={[styles.actionIcon, { backgroundColor: colors.primaryMuted }]}>
              <Icon name={action.icon} size={22} color="primaryText" />
            </View>
            <Text variant="caption" tone="secondary" align="center" numberOfLines={2}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <BudgetSummary reference={referenceForMonth(month, today, startDay)} />

      {month === currentMonth ? <FinancialHealthCard today={today} currency={currency} /> : null}

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
  waiting: { marginTop: spacing.xl },
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
  heroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: -spacing.sm,
    marginRight: -spacing.sm,
  },
  heroTitle: {
    flex: 1,
  },
  hero: {
    gap: spacing.sm,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  netChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  rate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rateTrack: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  rateFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  welcome: {
    gap: spacing.lg,
    padding: spacing['3xl'],
  },
  welcomeIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  steps: {
    gap: spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.xl,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
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
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
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
