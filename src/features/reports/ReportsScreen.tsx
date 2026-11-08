import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import {
  activeSubscriptionCosts,
  budgetsForPeriod,
  buildCurrencyReport,
  calendarDateToLocalDate,
  goalStanding,
  monthOf,
  monthRange,
  pickPrimaryCurrency,
  reportRanges,
  type CalendarDate,
  type InclusiveRange,
  type ReportPreset,
} from '@/core/finance';
import { useDataQuery, type GoalProgress, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Amount,
  Badge,
  BarChart,
  CalendarPicker,
  Card,
  Chip,
  ChipGroup,
  EmptyState,
  ProgressBar,
  Screen,
  Section,
  Text,
} from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { useToday } from '../finance/useToday';
import { loadReport } from './load';

const PRESETS: readonly ReportPreset[] = ['month', 'quarter', 'year', 'custom'];

function axisLabel(start: CalendarDate, end: CalendarDate, locale: string): string {
  const startDay = Number(start.slice(8));
  const endDay = Number(end.slice(8));
  if (start === end) return String(startDay);
  const fullMonth = monthRange(start.slice(0, 7));
  if (start === fullMonth.start && end === fullMonth.end) {
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(
      calendarDateToLocalDate(start),
    );
  }
  if (start.slice(0, 7) === end.slice(0, 7)) return `${startDay}–${endDay}`;
  return `${startDay}/${Number(start.slice(5, 7))}`;
}

function rangeLabel(
  range: InclusiveRange,
  formatDate: (date: Date, style?: 'short' | 'medium' | 'long') => string,
): string {
  const from = formatDate(calendarDateToLocalDate(range.from), 'medium');
  const to = formatDate(calendarDateToLocalDate(range.to), 'medium');
  return from === to ? from : `${from} – ${to}`;
}

function currenciesOf(data: Awaited<ReturnType<typeof loadReport>>): string[] {
  const codes = [
    ...data.accounts.map((account) => account.currency),
    ...data.rows.map((row) => row.currency),
    ...data.budgets.map((budget) => budget.currency),
    ...data.subscriptions.filter((item) => item.status === 'active').map((item) => item.currency),
    ...data.goals.map((goal) => goal.currency),
  ];
  const unique = [...new Set(codes)];
  if (unique.length === 0) return [];
  const primary = pickPrimaryCurrency(
    data.accounts.length > 0 ? data.accounts.map((account) => account.currency) : unique,
  );
  return unique.sort((left, right) =>
    left === primary ? -1 : right === primary ? 1 : left.localeCompare(right),
  );
}

export function ReportsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDate, formatMoney, formatPercent, locale } = useLocaleFormat();
  const today = useToday();
  const currentMonth = monthRange(monthOf(today));
  const [preset, setPreset] = useState<ReportPreset>('month');
  const [customFrom, setCustomFrom] = useState<CalendarDate>(currentMonth.start);
  const [customTo, setCustomTo] = useState<CalendarDate>(currentMonth.end);
  const [currency, setCurrency] = useState<string | null>(null);
  const ranges = reportRanges(preset, today, { from: customFrom, to: customTo });
  const query = useDataQuery(
    useCallback(
      (repositories: Repositories) => {
        const window = reportRanges(preset, today, { from: customFrom, to: customTo });
        if (!window) return Promise.resolve(null);
        return loadReport(repositories, window.current, window.previous);
      },
      [preset, today, customFrom, customTo],
    ),
  );

  const header = { title: t('reports.title'), subtitle: t('reports.subtitle') };
  const controls = (
    <View style={styles.stack}>
      <ChipGroup label={t('reports.period')}>
        {PRESETS.map((value) => (
          <Chip
            key={value}
            label={t(`reports.presets.${value}`)}
            selected={preset === value}
            onPress={() => setPreset(value)}
          />
        ))}
      </ChipGroup>
      {preset === 'custom' ? (
        <View style={styles.stack}>
          <Text variant="label">{t('reports.from')}</Text>
          <CalendarPicker
            value={customFrom}
            onChange={setCustomFrom}
            locale={locale}
            today={today}
            labels={{
              previousMonth: t('reports.previousMonth'),
              nextMonth: t('reports.nextMonth'),
            }}
          />
          <Text variant="label">{t('reports.to')}</Text>
          <CalendarPicker
            value={customTo}
            onChange={setCustomTo}
            locale={locale}
            today={today}
            labels={{
              previousMonth: t('reports.previousMonth'),
              nextMonth: t('reports.nextMonth'),
            }}
          />
        </View>
      ) : null}
    </View>
  );

  if (!ranges) {
    return (
      <Screen {...header}>
        {controls}
        <Text variant="callout" tone="negative">
          {t('reports.invalidRange')}
        </Text>
      </Screen>
    );
  }

  if (!query.data) {
    return (
      <Screen {...header}>
        {controls}
        {query.status === 'error' ? (
          <EmptyState icon="alert-circle-outline" title={t('errors.loadFailed')} />
        ) : (
          <ActivityIndicator color={colors.primary} accessibilityLabel={t('common.loading')} />
        )}
      </Screen>
    );
  }

  const data = query.data;
  const currencies = currenciesOf(data);
  if (currencies.length === 0) {
    return (
      <Screen {...header}>
        {controls}
        <EmptyState
          icon="bar-chart-outline"
          title={t('reports.emptyTitle')}
          description={t('reports.emptyDescription')}
        />
      </Screen>
    );
  }

  const selected = currency && currencies.includes(currency) ? currency : currencies[0]!;
  const report = buildCurrencyReport(data.rows, selected, ranges.current, ranges.previous);
  const names = new Map(data.categories.map((category) => [category.id, category.name]));
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency: selected });
  const budgetRows = budgetsForPeriod(data.budgets, data.expenses, ranges.current).filter(
    (row) => row.currency === selected,
  );
  const subscription = activeSubscriptionCosts(data.subscriptions).find(
    (item) => item.currency === selected,
  );
  const goals = data.goals.filter((goal) => goal.currency === selected);
  const previousQuiet = report.previous.income === 0 && report.previous.expense === 0;
  const hasMovement = report.summary.income > 0 || report.summary.expense > 0;

  return (
    <Screen {...header}>
      {controls}
      {currencies.length > 1 ? (
        <ChipGroup label={t('reports.currency')}>
          {currencies.map((code) => (
            <Chip
              key={code}
              label={code}
              selected={code === selected}
              onPress={() => setCurrency(code)}
            />
          ))}
        </ChipGroup>
      ) : (
        <Text variant="label" tone="secondary">
          {selected}
        </Text>
      )}

      <Card>
        <Text variant="caption" tone="secondary">
          {rangeLabel(ranges.current, formatDate)}
        </Text>
        <View style={styles.metrics}>
          <Metric
            label={t('reports.income')}
            value={money(report.summary.income)}
            tone="positive"
          />
          <Metric
            label={t('reports.expense')}
            value={money(report.summary.expense)}
            tone="negative"
          />
          <Metric label={t('reports.net')} value={money(report.summary.net)} />
          <Metric
            label={t('reports.savingsRate')}
            value={
              report.summary.savingsRate === null
                ? t('reports.savingsRateUndefined')
                : formatPercent(report.summary.savingsRate, 1)
            }
          />
        </View>
      </Card>

      <Section
        title={t('reports.comparedWith', { period: rangeLabel(ranges.previous, formatDate) })}>
        <Card style={styles.stack}>
          {previousQuiet ? (
            <Text variant="callout" tone="secondary">
              {t('reports.previousEmpty')}
            </Text>
          ) : null}
          <Comparison
            label={t('reports.income')}
            current={report.summary.income}
            previous={report.previous.income}
            format={money}
            same={t('reports.noChange')}
            up={t('reports.deltaUp', {
              amount: money(Math.abs(report.summary.income - report.previous.income)),
            })}
            down={t('reports.deltaDown', {
              amount: money(Math.abs(report.summary.income - report.previous.income)),
            })}
          />
          <Comparison
            label={t('reports.expense')}
            current={report.summary.expense}
            previous={report.previous.expense}
            format={money}
            same={t('reports.noChange')}
            up={t('reports.deltaUp', {
              amount: money(Math.abs(report.summary.expense - report.previous.expense)),
            })}
            down={t('reports.deltaDown', {
              amount: money(Math.abs(report.summary.expense - report.previous.expense)),
            })}
          />
        </Card>
      </Section>

      <Section title={t('reports.evolution')}>
        <Card>
          {hasMovement ? (
            <View style={styles.stack}>
              <View style={styles.legend}>
                <Legend swatch={colors.positive} label={t('reports.income')} />
                <Legend swatch={colors.negative} label={t('reports.expense')} />
              </View>
              <Text variant="caption" tone="secondary">
                {t('reports.evolutionDescription')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={report.evolution.length > 8}
                contentContainerStyle={styles.chartScroll}>
                <View style={{ minWidth: report.evolution.length * 48, flexGrow: 1 }}>
                  <BarChart
                    seriesColors={[colors.positive, colors.negative]}
                    groups={report.evolution.map((point) => ({
                      key: point.key,
                      label: axisLabel(point.start, point.end, locale),
                      values: [point.income, point.expense],
                      highlighted: point.start <= today && point.end >= today,
                      accessibilityLabel: t('reports.chartPoint', {
                        label: rangeLabel({ from: point.start, to: point.end }, formatDate),
                        income: money(point.income),
                        expense: money(point.expense),
                      }),
                    }))}
                  />
                </View>
              </ScrollView>
            </View>
          ) : (
            <Text variant="callout" tone="secondary">
              {t('reports.evolutionEmpty')}
            </Text>
          )}
        </Card>
      </Section>

      <Section title={t('reports.byCategory')}>
        <Card style={styles.stack}>
          {report.categories.length === 0 ? (
            <Text variant="callout" tone="secondary">
              {t('reports.noExpenses')}
            </Text>
          ) : (
            report.categories.map((item) => {
              const name = item.categoryId
                ? (names.get(item.categoryId) ?? '—')
                : t('reports.uncategorized');
              const percent = formatPercent(item.share, 0);
              return (
                <View
                  key={item.categoryId ?? 'none'}
                  accessible
                  accessibilityLabel={`${name}: ${money(item.amount)}, ${percent}`}>
                  <View style={styles.row}>
                    <Text variant="label" style={styles.flex} numberOfLines={1}>
                      {name}
                    </Text>
                    <Amount
                      value={{ amountMinor: item.amount, currency: selected }}
                      variant="label"
                    />
                    <Text variant="caption" tone="tertiary" tabular>
                      {percent}
                    </Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width: `${Math.max(item.share * 100, item.amount > 0 ? 2 : 0)}%`,
                          backgroundColor: colors.negative,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })
          )}
        </Card>
      </Section>

      <Section title={t('reports.budgets')}>
        <Card style={styles.stack}>
          {budgetRows.length === 0 ? (
            <Text variant="callout" tone="secondary">
              {t('reports.budgetsEmpty')}
            </Text>
          ) : (
            budgetRows.map((row) => {
              const name = names.get(row.categoryId) ?? '—';
              const status = t(row.status === 'over' ? 'reports.budgetOver' : 'reports.budgetMet');
              const windows =
                row.windows > 1 ? t('reports.budgetWindows', { count: row.windows }) : '';
              return (
                <View
                  key={row.id}
                  style={styles.stack}
                  accessible
                  accessibilityLabel={`${name}: ${money(row.spent)} / ${money(row.limit)}, ${status}${windows ? `. ${windows}` : ''}`}>
                  <View style={styles.row}>
                    <Text variant="label" style={styles.flex} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text variant="caption" tone="secondary" tabular>
                      {money(row.spent)} / {money(row.limit)}
                    </Text>
                    <Badge label={status} tone={row.status === 'over' ? 'negative' : 'positive'} />
                  </View>
                  {windows ? (
                    <Text variant="caption" tone="tertiary">
                      {windows}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
        </Card>
      </Section>

      <Section title={t('reports.subscriptions')}>
        <Card style={styles.stack}>
          <Text variant="caption" tone="secondary">
            {t('reports.subscriptionsNote')}
          </Text>
          {subscription ? (
            <View style={styles.metrics}>
              <Metric label={t('reports.monthlyCost')} value={money(subscription.monthlyMinor)} />
              <Metric label={t('reports.yearlyCost')} value={money(subscription.yearlyMinor)} />
            </View>
          ) : (
            <Text variant="callout" tone="secondary">
              {t('reports.subscriptionsEmpty')}
            </Text>
          )}
        </Card>
      </Section>

      <Section title={t('reports.goals')}>
        <Card style={styles.stack}>
          <Text variant="caption" tone="secondary">
            {t('reports.goalNote')}
          </Text>
          {goals.length === 0 ? (
            <Text variant="callout" tone="secondary">
              {t('reports.goalsEmpty')}
            </Text>
          ) : (
            goals.map((goal) => <GoalRow key={goal.id} goal={goal} currency={selected} />)
          )}
        </Card>
      </Section>
    </Screen>
  );
}

function GoalRow({ goal, currency }: { goal: GoalProgress; currency: string }) {
  const { t } = useTranslation();
  const { formatMoney } = useLocaleFormat();
  const standing = goalStanding(goal.targetAmount, goal.savedAmount);
  const saved = formatMoney({ amountMinor: standing.saved, currency });
  const target = formatMoney({ amountMinor: goal.targetAmount, currency });
  return (
    <View
      accessible
      accessibilityLabel={`${goal.name}: ${t('reports.goalSaved')} ${saved}, ${t('reports.goalTarget')} ${target}`}
      style={styles.stack}>
      <Text variant="label">{goal.name}</Text>
      <ProgressBar
        progress={standing.ratio}
        tone={standing.ratio >= 1 ? 'positive' : 'accent'}
        accessibilityLabel={`${saved} / ${target}`}
      />
      <Text variant="caption" tone="secondary">
        {t('reports.goalSaved')} {saved} · {t('reports.goalTarget')} {target}
      </Text>
      <Text variant="caption" tone="secondary">
        {t('reports.goalInPeriod')}{' '}
        {formatMoney({ amountMinor: goal.contributedInPeriod, currency })}
      </Text>
    </View>
  );
}

function Metric({
  label,
  value,
  tone = 'primary',
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'positive' | 'negative';
}) {
  return (
    <View style={styles.metric} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <Text variant="title3" tone={tone} tabular>
        {value}
      </Text>
    </View>
  );
}

function Comparison({
  label,
  current,
  previous,
  format,
  same,
  up,
  down,
}: {
  label: string;
  current: number;
  previous: number;
  format: (amount: number) => string;
  same: string;
  up: string;
  down: string;
}) {
  const detail = current === previous ? same : current > previous ? up : down;
  return (
    <View accessible accessibilityLabel={`${label}: ${format(previous)}. ${detail}`}>
      <Text variant="label">{label}</Text>
      <Text variant="callout" tabular>
        {format(previous)}
      </Text>
      <Text variant="caption" tone="secondary">
        {detail}
      </Text>
    </View>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: swatch }]} />
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { width: '46%', flexGrow: 1, gap: spacing.xxs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%' },
  chartScroll: { flexGrow: 1 },
  legend: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 12, height: 12, borderRadius: 2 },
});
