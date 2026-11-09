import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  addMonths,
  budgetFigures,
  calendarDateToLocalDate,
  monthKeyToLocalDate,
  monthOf,
  monthRange,
  spendBySlice,
  weekSlices,
  type MonthKey,
} from '@/core/finance';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Badge,
  BarChart,
  Button,
  Card,
  CategoryIcon,
  EmptyState,
  HeroCard,
  IconButton,
  Screen,
  Text,
} from '@/ui/components';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { radius, spacing, useTheme } from '@/ui/theme';

import { useSync } from '../account/SyncProvider';
import { useToday } from '../finance/useToday';
import { BudgetMeter, budgetTone } from './BudgetMeter';
import {
  budgetCurrencies,
  loadBudgetScreen,
  type BudgetScreenData,
  type PresentedBudget,
} from './load';

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

function openBudget(id: string, reference: string) {
  router.push({ pathname: '/budget/[id]', params: { id, on: reference } } as Href);
}

export function BudgetsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { snapshot } = useSync();
  const breakpoint = useBreakpoint();
  const { formatDate, formatMoney, formatMonthYear, formatPercent } = useLocaleFormat();
  const today = useToday();
  const currentMonth = monthOf(today);
  const [month, setMonth] = useState<MonthKey>(currentMonth);
  const reference = month === currentMonth ? today : monthRange(month).end;
  const query = useDataQuery(
    useCallback(
      (repositories: Repositories) => loadBudgetScreen(repositories, reference),
      [reference],
    ),
  );

  const header = {
    title: t('nav.budgets'),
    subtitle: t('budgets.subtitle'),
    headerRight:
      breakpoint === 'compact' ? (
        <IconButton
          icon="add"
          variant="filled"
          color="primaryText"
          accessibilityLabel={t('budgets.add')}
          onPress={() => router.push('/budget/new' as Href)}
        />
      ) : (
        <Button
          label={t('budgets.add')}
          icon="add"
          onPress={() => router.push('/budget/new' as Href)}
        />
      ),
  };

  if (!query.data) {
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

  const data = query.data;
  const money = (amount: number, currency: string) =>
    formatMoney({ amountMinor: amount, currency });

  return (
    <Screen {...header}>
      <View
        style={[styles.monthBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconButton
          icon="chevron-back"
          accessibilityLabel={t('dashboard.previousMonth')}
          onPress={() => setMonth((value) => addMonths(value, -1))}
        />
        <Text variant="title3" align="center" style={styles.flex} accessibilityLiveRegion="polite">
          {capitalize(formatMonthYear(monthKeyToLocalDate(month)))}
        </Text>
        <IconButton
          icon="chevron-forward"
          accessibilityLabel={t('dashboard.nextMonth')}
          onPress={() => setMonth((value) => addMonths(value, 1))}
        />
      </View>
      {snapshot ? (
        <Text
          variant="caption"
          tone={
            snapshot.status === 'error'
              ? 'negative'
              : snapshot.status === 'offline' || snapshot.status === 'authRequired'
                ? 'warning'
                : 'secondary'
          }>
          {snapshot.status === 'idle' && snapshot.conflicts > 0
            ? t('account.conflicts', { count: snapshot.conflicts })
            : snapshot.status === 'idle' && snapshot.pending > 0
              ? t('account.pending', { count: snapshot.pending })
              : t(`account.status.${snapshot.status}`)}
        </Text>
      ) : null}
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

      {data.budgets.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon="pie-chart-outline"
            title={t('budgets.emptyTitle')}
            description={t('budgets.emptyDescription')}>
            <Button
              label={t('budgets.start')}
              icon="add"
              onPress={() => router.push('/budget/new' as Href)}
            />
          </EmptyState>
        </Card>
      ) : (
        <View style={styles.stack}>
          {budgetCurrencies(
            data.presented.map((item) => item.budget),
            data.accounts.map((account) => account.currency),
          ).map((currency) => (
            <CurrencySection
              key={currency}
              currency={currency}
              data={data}
              month={month}
              reference={reference}
              money={money}
              formatPercent={formatPercent}
              formatDate={formatDate}
              primary={colors.primary}
            />
          ))}
          <Text variant="caption" tone="tertiary">
            {t('budgets.countsExpenses')}
          </Text>
        </View>
      )}
    </Screen>
  );
}

function CurrencySection({
  currency,
  data,
  month,
  reference,
  money,
  formatPercent,
  formatDate,
  primary,
}: {
  currency: string;
  data: BudgetScreenData;
  month: MonthKey;
  reference: string;
  money: (amount: number, currency: string) => string;
  formatPercent: (ratio: number, digits?: number) => string;
  formatDate: (date: Date, style: 'medium' | 'short') => string;
  primary: string;
}) {
  const { t } = useTranslation();
  const {
    colors: { heroTrack, heroNegative, heroPositive },
  } = useTheme();
  const items = data.presented.filter((item) => item.budget.currency === currency);
  const active = items.filter((item) => item.window);
  const waiting = items.filter((item) => !item.window);
  const limit = active.reduce((sum, item) => sum + item.budget.amount, 0);
  const spent = active.reduce((sum, item) => sum + item.figures.spent, 0);
  const totals = active.length > 0 ? budgetFigures(spent, limit) : null;
  const range = monthRange(month);
  const slices = weekSlices(range.start, range.end);
  const series = spendBySlice(
    data.lines,
    active.map((item) => item.budget),
    slices,
    currency,
    reference,
  );
  const hasSpend = series.some((value) => value > 0);

  return (
    <View style={styles.stack}>
      {totals ? (
        <HeroCard style={styles.hero}>
          <Text variant="overline" tone="heroMuted">
            {t('budgets.totalLimit')}
          </Text>
          <Text variant="amountHero" tone="hero" tabular numberOfLines={1} adjustsFontSizeToFit>
            {money(totals.limit, currency)}
          </Text>
          <View style={styles.kpis}>
            <View style={styles.kpi}>
              <Text variant="caption" tone="heroMuted">
                {t('budgets.spent')}
              </Text>
              <Text variant="title3" tone="hero" tabular>
                {money(totals.spent, currency)}
              </Text>
            </View>
            <View style={styles.kpi}>
              <Text variant="caption" tone="heroMuted">
                {totals.available < 0 ? t('budgets.over') : t('budgets.available')}
              </Text>
              <Text
                variant="title3"
                tone={totals.available < 0 ? 'heroNegative' : 'heroPositive'}
                tabular>
                {money(Math.abs(totals.available), currency)}
              </Text>
            </View>
            <View style={styles.kpi}>
              <Text variant="caption" tone="heroMuted">
                {t('budgets.used')}
              </Text>
              <Text
                variant="title3"
                tone={totals.level === 'over' ? 'heroNegative' : 'hero'}
                tabular>
                {formatPercent(totals.ratio, 0)}
              </Text>
            </View>
          </View>
          <View style={[styles.heroTrack, { backgroundColor: heroTrack }]}>
            <View
              style={[
                styles.heroFill,
                {
                  width: `${Math.min(Math.max(totals.ratio, 0), 1) * 100}%`,
                  backgroundColor: totals.level === 'over' ? heroNegative : heroPositive,
                },
              ]}
            />
          </View>
          <Text variant="caption" tone="heroMuted">
            {t('budgets.categoryCount', { count: active.length })}
          </Text>
        </HeroCard>
      ) : null}

      {totals && hasSpend ? (
        <Card style={styles.cardGap}>
          <Text variant="label">{t('budgets.evolution')}</Text>
          <BarChart
            seriesColors={[primary]}
            groups={slices.map((slice, index) => ({
              key: slice.key,
              label: String(Number(slice.start.slice(8))),
              values: [series[index] ?? 0],
              highlighted: slice.start <= reference && reference <= slice.end,
              accessibilityLabel: t('budgets.sliceSummary', {
                from: formatDate(calendarDateToLocalDate(slice.start), 'medium'),
                amount: money(series[index] ?? 0, currency),
              }),
            }))}
          />
        </Card>
      ) : null}
      {totals && !hasSpend ? (
        <Text variant="callout" tone="secondary">
          {t('budgets.noSpend')}
        </Text>
      ) : null}

      {active.map((item) => (
        <BudgetCard
          key={item.budget.id}
          item={item}
          money={money}
          formatPercent={formatPercent}
          onPress={() => openBudget(item.budget.id, reference)}
        />
      ))}
      {waiting.map((item) => (
        <BudgetCard
          key={item.budget.id}
          item={item}
          money={money}
          formatPercent={formatPercent}
          onPress={() => openBudget(item.budget.id, reference)}
        />
      ))}
    </View>
  );
}

function BudgetCard({
  item,
  money,
  formatPercent,
  onPress,
}: {
  item: PresentedBudget;
  money: (amount: number, currency: string) => string;
  formatPercent: (ratio: number, digits?: number) => string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const name = item.category?.name ?? '—';
  const percent = formatPercent(item.figures.ratio, 0);
  const currency = item.budget.currency;

  return (
    <Card
      style={styles.cardGap}
      onPress={onPress}
      accessibilityLabel={t('budgets.progressLabel', { name, percent })}>
      <View style={styles.row}>
        <CategoryIcon
          icon={item.category?.icon ?? 'help-outline'}
          color={item.category?.color ?? 'slate'}
          size={36}
        />
        <View style={styles.flex}>
          <Text variant="label" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" tone="tertiary">
            {t(`budgets.period.${item.budget.period}`)}
          </Text>
        </View>
        {item.figures.level !== 'ok' && item.window ? (
          <Badge
            label={t(`budgets.level.${item.figures.level}`)}
            tone={budgetTone(item.figures.level)}
          />
        ) : null}
      </View>
      {item.window ? (
        <>
          <BudgetMeter
            level={item.figures.level}
            ratio={item.figures.ratio}
            accessibilityLabel={t('budgets.progressLabel', { name, percent })}
          />
          <View style={[styles.row, styles.between]}>
            <Text variant="footnote" tabular>
              {money(item.figures.spent, currency)}
            </Text>
            <Text variant="footnote" tone="secondary" tabular>
              {money(item.budget.amount, currency)}
            </Text>
          </View>
          <Text variant="caption" tone={item.figures.available < 0 ? 'negative' : 'secondary'}>
            {item.figures.available < 0
              ? t('budgets.overBy', { amount: money(-item.figures.available, currency) })
              : t('budgets.remaining', { amount: money(item.figures.available, currency) })}
          </Text>
        </>
      ) : (
        <Text variant="footnote" tone="secondary">
          {t('budgets.notStarted')}
        </Text>
      )}
    </Card>
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
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs,
  },
  heroTrack: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  heroFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  between: {
    justifyContent: 'space-between',
  },
  stack: {
    gap: spacing.lg,
  },
  hero: {
    gap: spacing.sm,
  },
  kpis: {
    flexDirection: 'row',
    gap: spacing.md,
    alignSelf: 'stretch',
  },
  kpi: {
    flex: 1,
    gap: spacing.xs,
  },
  cardGap: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
