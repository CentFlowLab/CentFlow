import { router, type Href } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { goalStatus } from '@/core/finance';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { Button, Card, EmptyState, HeroCard, IconButton, Screen, Text } from '@/ui/components';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { radius, spacing, useTheme } from '@/ui/theme';

import { GoalCard } from './GoalCard';

const NEW_HREF = '/goal/new' as Href;

async function load(repositories: Repositories) {
  const goals = await repositories.goals.list();
  const contributions = await Promise.all(
    goals.map((goal) => repositories.goals.listContributions(goal.id)),
  );
  return goals.map((goal, index) => {
    const status = goalStatus(goal.targetAmount, contributions[index] ?? []);
    return { goal, status, savedMinor: status.saved };
  });
}

type Loaded = Awaited<ReturnType<typeof load>>[number];

/** Em curso: mais perto do fim primeiro. Concluídos: os mais recentes primeiro. */
function sections(items: readonly Loaded[]) {
  const inProgress = items
    .filter((item) => !item.status.reached)
    .sort((a, b) => b.status.ratio - a.status.ratio || a.goal.name.localeCompare(b.goal.name));
  const completed = items
    .filter((item) => item.status.reached)
    .sort((a, b) => (b.status.achievedOn ?? '').localeCompare(a.status.achievedOn ?? ''));
  return { inProgress, completed };
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
  const { formatMoney, formatPercent } = useLocaleFormat();
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
  const groups = sections(query.data);
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

      {[
        { key: 'inProgress', title: t('goals.inProgress'), items: groups.inProgress },
        { key: 'completed', title: t('goals.completed'), items: groups.completed },
      ]
        .filter((section) => section.items.length > 0)
        .map((section) => (
          <View key={section.key} style={styles.section}>
            <Text variant="title3" accessibilityRole="header">
              {`${section.title} · ${section.items.length}`}
            </Text>
            <View style={styles.row}>
              {section.items.map(({ goal, status }) => (
                <View key={goal.id} style={{ flexGrow: 1, flexBasis: isWide ? 340 : '100%' }}>
                  <GoalCard
                    goal={goal}
                    status={status}
                    onPress={() => router.push(`/goal/${goal.id}` as Href)}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      <Text variant="caption" tone="tertiary">
        {t('goals.doesNotChangeBalances')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  hero: { flexGrow: 1, flexBasis: 260, gap: spacing.sm },
  heroTrack: { height: 6, borderRadius: radius.full, overflow: 'hidden', marginTop: spacing.xs },
  heroFill: { height: '100%', borderRadius: radius.full },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  section: { gap: spacing.sm },
});
