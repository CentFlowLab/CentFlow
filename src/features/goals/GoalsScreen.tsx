import { router, type Href } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { calendarDateToLocalDate, remainingAmountMinor, savedAmountMinor } from '@/core/finance';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Amount,
  Button,
  Card,
  EmptyState,
  HeroCard,
  Icon,
  IconButton,
  ProgressBar,
  Screen,
  Text,
} from '@/ui/components';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { radius, spacing, useTheme } from '@/ui/theme';

const NEW_HREF = '/goal/new' as Href;

async function load(repositories: Repositories) {
  const goals = await repositories.goals.list();
  const contributions = await Promise.all(
    goals.map((goal) => repositories.goals.listContributions(goal.id)),
  );
  return goals.map((goal, index) => ({
    goal,
    savedMinor: savedAmountMinor((contributions[index] ?? []).map((item) => item.amount)),
  }));
}

type Totals = { saved: number; target: number; reached: number; count: number };

/** Somas por moeda: moedas diferentes nunca se misturam. */
function totalsByCurrency(
  items: readonly { goal: { currency: string; targetAmount: number }; savedMinor: number }[],
): [string, Totals][] {
  const totals = new Map<string, Totals>();
  for (const { goal, savedMinor } of items) {
    const current = totals.get(goal.currency) ?? { saved: 0, target: 0, reached: 0, count: 0 };
    current.saved += savedMinor;
    current.target += goal.targetAmount;
    current.count += 1;
    if (savedMinor >= goal.targetAmount) current.reached += 1;
    totals.set(goal.currency, current);
  }
  return [...totals];
}

export function GoalsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const breakpoint = useBreakpoint();
  const { formatDate, formatMoney, formatPercent } = useLocaleFormat();
  const query = useDataQuery(useCallback((repositories: Repositories) => load(repositories), []));

  const add = () => router.push(NEW_HREF);
  const header = {
    title: t('nav.goals'),
    subtitle: t('goals.subtitle'),
    headerRight:
      breakpoint === 'compact' ? (
        <IconButton
          icon="add"
          variant="filled"
          color="primaryText"
          accessibilityLabel={t('goals.add')}
          onPress={add}
        />
      ) : (
        <Button label={t('goals.add')} icon="add" onPress={add} />
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

  if (query.data.length === 0) {
    return (
      <Screen {...header}>
        <Card padding="none">
          <EmptyState
            icon="flag-outline"
            title={t('goals.emptyTitle')}
            description={t('goals.emptyDescription')}>
            <Button label={t('goals.start')} icon="add" onPress={add} />
          </EmptyState>
        </Card>
      </Screen>
    );
  }

  const isWide = breakpoint !== 'compact';
  const money = (amountMinor: number, currency: string) => formatMoney({ amountMinor, currency });

  return (
    <Screen {...header}>
      <View style={styles.row}>
        {totalsByCurrency(query.data).map(([currency, totals]) => {
          const share = totals.target === 0 ? 0 : Math.min(totals.saved / totals.target, 1);
          return (
            <HeroCard key={currency} style={styles.hero}>
              <Text variant="overline" tone="heroMuted">
                {t('goals.totalSaved')}
              </Text>
              <Text variant="amountHero" tone="hero" tabular numberOfLines={1} adjustsFontSizeToFit>
                {money(totals.saved, currency)}
              </Text>
              <Text variant="footnote" tone="heroMuted" tabular>
                {t('goals.ofTarget', { amount: money(totals.target, currency) })}
              </Text>
              <View style={[styles.heroTrack, { backgroundColor: colors.heroTrack }]}>
                <View
                  style={[
                    styles.heroFill,
                    { width: `${share * 100}%`, backgroundColor: colors.heroPositive },
                  ]}
                />
              </View>
              <View style={styles.heroFooter}>
                <Text variant="caption" tone="heroMuted">
                  {t('goals.reachedCount', { reached: totals.reached, total: totals.count })}
                </Text>
                <Text variant="caption" tone="hero" tabular>
                  {formatPercent(share, 0)}
                </Text>
              </View>
            </HeroCard>
          );
        })}
      </View>

      <View style={styles.row}>
        {query.data.map(({ goal, savedMinor }) => {
          const reached = savedMinor >= goal.targetAmount;
          const target = money(goal.targetAmount, goal.currency);
          const remaining = money(
            remainingAmountMinor(goal.targetAmount, savedMinor),
            goal.currency,
          );
          const status = reached ? t('goals.reached') : `${t('goals.remaining')}: ${remaining}`;
          return (
            <Card
              key={goal.id}
              onPress={() => router.push(`/goal/${goal.id}` as Href)}
              accessibilityLabel={`${goal.name}, ${money(savedMinor, goal.currency)} ${t(
                'goals.ofTarget',
                { amount: target },
              )}, ${status}`}
              style={[styles.goal, { flexBasis: isWide ? 300 : '100%' }]}>
              <View style={styles.goalHeader}>
                <View
                  style={[
                    styles.goalIcon,
                    { backgroundColor: reached ? colors.positiveMuted : colors.primaryMuted },
                  ]}>
                  <Icon
                    name={reached ? 'checkmark' : 'flag-outline'}
                    size={18}
                    color={reached ? 'positive' : 'primaryText'}
                  />
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {goal.name}
                  </Text>
                  <Text variant="footnote" tone="secondary">
                    {goal.targetOn
                      ? formatDate(calendarDateToLocalDate(goal.targetOn), 'medium')
                      : t('goals.noDate')}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={18} color="textTertiary" />
              </View>
              <View style={styles.amounts}>
                <Amount
                  value={{ amountMinor: savedMinor, currency: goal.currency }}
                  variant="amount"
                />
                <Text variant="footnote" tone="secondary" tabular>
                  {t('goals.ofTarget', { amount: target })}
                </Text>
              </View>
              <ProgressBar
                progress={goal.targetAmount === 0 ? 0 : savedMinor / goal.targetAmount}
                tone={reached ? 'positive' : 'accent'}
                accessibilityLabel={status}
              />
              <Text variant="caption" tone={reached ? 'positive' : 'secondary'}>
                {status}
              </Text>
            </Card>
          );
        })}
      </View>
      <Text variant="caption" tone="tertiary">
        {t('goals.doesNotChangeBalances')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  flex: { flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  hero: { flexGrow: 1, flexBasis: 260, gap: spacing.sm },
  heroTrack: { height: 6, borderRadius: radius.full, overflow: 'hidden', marginTop: spacing.xs },
  heroFill: { height: '100%', borderRadius: radius.full },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  goal: { flexGrow: 1, gap: spacing.md },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  goalIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amounts: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.sm },
});
