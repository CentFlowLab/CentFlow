import { router, type Href } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { budgetFigures, type CalendarDate } from '@/core/finance';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { Button, Card, CategoryIcon, Section, Text } from '@/ui/components';
import { spacing } from '@/ui/theme';

import { BudgetMeter, budgetTone } from './BudgetMeter';
import { budgetCurrencies, loadBudgetScreen, type PresentedBudget } from './load';

type Props = { reference: CalendarDate };

/** Resumo real no dashboard. Sem orçamentos, só a ação para os criar. */
export function BudgetSummary({ reference }: Props) {
  const { t } = useTranslation();
  const { formatMoney, formatPercent } = useLocaleFormat();
  const query = useDataQuery(
    useCallback(
      (repositories: Repositories) => loadBudgetScreen(repositories, reference),
      [reference],
    ),
  );
  const data = query.data;
  if (!data) return null;

  if (data.budgets.length === 0) {
    return (
      <Section title={t('budgets.summaryTitle')}>
        <Card>
          <Button
            label={t('budgets.start')}
            icon="pie-chart-outline"
            variant="secondary"
            onPress={() => router.push('/budget/new' as Href)}
          />
        </Card>
      </Section>
    );
  }

  const currencies = budgetCurrencies(
    data.presented.map((item) => item.budget),
    data.accounts.map((account) => account.currency),
  );
  const active = data.presented.filter((item) => item.window);

  return (
    <Section
      title={t('budgets.summaryTitle')}
      action={
        <Button
          label={t('budgets.summaryAction')}
          variant="ghost"
          size="sm"
          onPress={() => router.push('/budgets' as Href)}
        />
      }>
      <View style={styles.stack}>
        {active.length === 0 ? (
          <Card>
            <Text variant="callout" tone="secondary">
              {t('budgets.notStarted')}
            </Text>
          </Card>
        ) : (
          currencies.map((currency) => {
            const items = active.filter((item) => item.budget.currency === currency);
            if (items.length === 0) return null;
            const limit = items.reduce((sum, item) => sum + item.budget.amount, 0);
            const spent = items.reduce((sum, item) => sum + item.figures.spent, 0);
            const totals = budgetFigures(spent, limit);
            const near = items.filter((item) => item.figures.level !== 'ok');
            return (
              <Card key={currency} style={styles.card}>
                <View style={styles.kpis}>
                  <Metric
                    label={t('budgets.totalLimit')}
                    value={formatMoney({ amountMinor: totals.limit, currency })}
                  />
                  <Metric
                    label={t('budgets.spent')}
                    value={formatMoney({ amountMinor: totals.spent, currency })}
                    tone="negative"
                  />
                  <Metric
                    label={t('budgets.used')}
                    value={formatPercent(totals.ratio, 0)}
                    tone={budgetTone(totals.level)}
                  />
                </View>
                {near.length > 0 ? (
                  <View style={styles.stack}>
                    <Text variant="caption" tone="secondary">
                      {t('budgets.nearLimit')}
                    </Text>
                    {near.map((item) => (
                      <NearRow
                        key={item.budget.id}
                        item={item}
                        percent={formatPercent(item.figures.ratio, 0)}
                        onPress={() =>
                          router.push({
                            pathname: '/budget/[id]',
                            params: { id: item.budget.id, on: reference },
                          } as Href)
                        }
                      />
                    ))}
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </View>
    </Section>
  );
}

function Metric({
  label,
  value,
  tone = 'primary',
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'negative' | 'positive' | 'warning';
}) {
  return (
    <View style={styles.kpi}>
      <Text variant="caption" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="title3" tone={tone} tabular numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function NearRow({
  item,
  percent,
  onPress,
}: {
  item: PresentedBudget;
  percent: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const name = item.category?.name ?? '—';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('budgets.progressLabel', { name, percent })}
      onPress={onPress}
      style={styles.near}>
      <CategoryIcon
        icon={item.category?.icon ?? 'help-outline'}
        color={item.category?.color ?? 'slate'}
        size={32}
      />
      <View style={styles.flex}>
        <Text variant="label" numberOfLines={1}>
          {name}
        </Text>
        <BudgetMeter
          level={item.figures.level}
          ratio={item.figures.ratio}
          accessibilityLabel={t('budgets.progressLabel', { name, percent })}
        />
      </View>
      <Text variant="caption" tone={budgetTone(item.figures.level)} tabular>
        {percent}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  card: {
    gap: spacing.lg,
  },
  kpis: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  kpi: {
    flex: 1,
    gap: spacing.xs,
  },
  near: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
  },
  flex: {
    flex: 1,
    gap: spacing.xs,
  },
});
