import { router } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  calendarDateToLocalDate,
  detailSlices,
  isValidCalendarDate,
  monthKeyToLocalDate,
  spendBySlice,
  type CalendarDate,
  type Entry,
} from '@/core/finance';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Badge,
  BarChart,
  Button,
  Card,
  Dialog,
  Divider,
  EmptyState,
  FormScreen,
  Text,
} from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { EntryListItem } from '../finance/EntryListItem';
import { closeModal } from '../finance/navigation';
import type { FinanceLookups } from '../finance/useFinanceLookups';
import { useToday } from '../finance/useToday';
import { BudgetForm } from './BudgetForm';
import { BudgetMeter, budgetTone } from './BudgetMeter';
import { loadBudgetDetail, type PresentedBudget } from './load';
import { useFinancialMonthStartDay } from '../preferences';

export function NewBudgetScreen() {
  return <BudgetForm />;
}

export function BudgetDetailScreen({ id, reference }: { id: string; reference?: string }) {
  const { t } = useTranslation();
  const today = useToday();
  const on = reference && isValidCalendarDate(reference) ? reference : today;
  const startDay = useFinancialMonthStartDay();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const repositories = useRepositories();
  const query = useDataQuery(
    useCallback(
      (repos: Repositories) => loadBudgetDetail(repos, id, on, startDay),
      [id, on, startDay],
    ),
  );
  const item = query.data?.item ?? null;

  if (editing && item) {
    return (
      <BudgetForm
        budget={item.budget}
        onClose={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  return (
    <FormScreen
      title={item?.category?.name ?? t('budgets.detailTitle')}
      closeLabel={t('common.close')}
      onClose={() => closeModal('/budgets')}
      footer={
        item ? (
          <View style={styles.actions}>
            <Button
              label={t('budgets.edit')}
              variant="secondary"
              icon="create-outline"
              onPress={() => setEditing(true)}
            />
            <Button
              label={t('budgets.delete')}
              variant="destructive"
              icon="trash-outline"
              onPress={() => setConfirming(true)}
            />
          </View>
        ) : undefined
      }>
      {!query.data ? (
        query.status === 'error' ? (
          <EmptyState icon="alert-circle-outline" title={t('errors.loadFailed')} />
        ) : (
          <ActivityIndicator />
        )
      ) : !item ? (
        <EmptyState icon="search-outline" title={t('budgets.notFoundTitle')} />
      ) : (
        <DetailBody
          item={item}
          lines={query.data.lines}
          history={query.data.history}
          lookups={{
            accounts: new Map(query.data.accounts.map((account) => [account.id, account])),
            categories: new Map(query.data.categories.map((category) => [category.id, category])),
            accountList: query.data.accounts,
            categoryList: query.data.categories,
          }}
          reference={on}
        />
      )}
      <Dialog
        visible={confirming}
        title={t('budgets.deleteTitle')}
        message={t('budgets.deleteMessage')}
        onDismiss={() => {
          if (!deleting) setConfirming(false);
        }}
        actions={[
          {
            label: t('common.delete'),
            variant: 'destructive',
            loading: deleting,
            onPress: () => {
              setDeleting(true);
              void repositories.budgets.delete(id).then(
                () => closeModal('/budgets'),
                () => {
                  setDeleting(false);
                  setConfirming(false);
                },
              );
            },
          },
          {
            label: t('common.cancel'),
            variant: 'ghost',
            disabled: deleting,
            onPress: () => setConfirming(false),
          },
        ]}
      />
    </FormScreen>
  );
}

function DetailBody({
  item,
  lines,
  history,
  lookups,
  reference,
}: {
  item: PresentedBudget;
  lines: Parameters<typeof spendBySlice>[0];
  history: Entry[];
  lookups: FinanceLookups;
  reference: CalendarDate;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDate, formatMoney, formatPercent, locale } = useLocaleFormat();
  const currency = item.budget.currency;
  const money = (amount: number) => formatMoney({ amountMinor: amount, currency });
  const percent = formatPercent(item.figures.ratio, 0);
  const name = item.category?.name ?? '—';
  const slices = item.window ? detailSlices(item.window, item.budget.period) : [];
  const series = item.window ? spendBySlice(lines, [item.budget], slices, currency, reference) : [];
  const hasSpend = series.some((value) => value > 0);
  const delta = item.previous ? item.figures.spent - item.previous.spent : 0;

  return (
    <View style={styles.stack}>
      <Card style={styles.hero}>
        <Text variant="footnote" tone="secondary">
          {t(`budgets.period.${item.budget.period}`)}
        </Text>
        <Text variant="amountHero" tabular numberOfLines={1} adjustsFontSizeToFit>
          {money(item.budget.amount)}
        </Text>
        {item.window ? (
          <>
            <BudgetMeter
              level={item.figures.level}
              ratio={item.figures.ratio}
              accessibilityLabel={t('budgets.progressLabel', { name, percent })}
            />
            <View style={styles.kpis}>
              <Metric
                label={t('budgets.spent')}
                value={money(item.figures.spent)}
                tone="negative"
              />
              <Metric
                label={item.figures.available < 0 ? t('budgets.over') : t('budgets.available')}
                value={money(Math.abs(item.figures.available))}
                tone={item.figures.available < 0 ? 'negative' : 'positive'}
              />
              <Metric
                label={t('budgets.used')}
                value={percent}
                tone={budgetTone(item.figures.level)}
              />
            </View>
            {item.figures.level !== 'ok' ? (
              <Badge
                label={t(`budgets.level.${item.figures.level}`)}
                tone={budgetTone(item.figures.level)}
              />
            ) : null}
          </>
        ) : (
          <Text variant="callout" tone="secondary">
            {t('budgets.notStarted')}
          </Text>
        )}
      </Card>

      {item.previous ? (
        <Text variant="callout" tone="secondary">
          {delta === 0
            ? t('budgets.comparedSame')
            : t(delta > 0 ? 'budgets.comparedMore' : 'budgets.comparedLess', {
                amount: money(Math.abs(delta)),
              })}
        </Text>
      ) : null}

      {item.window && hasSpend ? (
        <Card style={styles.cardGap}>
          <Text variant="label">{t('budgets.detailEvolution')}</Text>
          <BarChart
            seriesColors={[colors.primary]}
            groups={slices.map((slice, index) => {
              const label =
                item.budget.period === 'yearly'
                  ? new Intl.DateTimeFormat(locale, { month: 'short' })
                      .format(monthKeyToLocalDate(slice.key))
                      .replace('.', '')
                  : String(Number(slice.start.slice(8)));
              return {
                key: slice.key,
                label,
                values: [series[index] ?? 0],
                highlighted: slice.start <= reference && reference <= slice.end,
                accessibilityLabel: t('budgets.sliceSummary', {
                  from: formatDate(calendarDateToLocalDate(slice.start), 'medium'),
                  amount: money(series[index] ?? 0),
                }),
              };
            })}
          />
        </Card>
      ) : null}

      <View style={styles.stack}>
        <Text variant="title3">{t('budgets.history')}</Text>
        {history.length === 0 ? (
          <Text variant="callout" tone="secondary">
            {t('budgets.noHistory')}
          </Text>
        ) : (
          <Card padding="xs">
            {history.map((entry, index) => (
              <Fragment key={entry.id}>
                {index > 0 ? <Divider /> : null}
                <EntryListItem
                  entry={entry}
                  lookups={lookups}
                  onPress={() => router.push({ pathname: '/entry/[id]', params: { id: entry.id } })}
                />
              </Fragment>
            ))}
          </Card>
        )}
      </View>
    </View>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'positive' | 'negative' | 'warning';
}) {
  return (
    <View style={styles.kpi}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <Text variant="title3" tone={tone} tabular>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  hero: {
    gap: spacing.md,
  },
  kpis: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  kpi: {
    flex: 1,
    gap: spacing.xs,
  },
  cardGap: {
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
});
