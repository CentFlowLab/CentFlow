import { router, type Href } from 'expo-router';
import { Fragment, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  activeSubscriptionCosts,
  calendarDateToLocalDate,
  type SubscriptionStatus,
} from '@/core/finance';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Amount,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  HeroCard,
  IconButton,
  ListItem,
  Screen,
  Text,
  type BadgeTone,
} from '@/ui/components';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { radius, spacing, useTheme, type ThemeColors } from '@/ui/theme';

const STATUS_TONE: Record<SubscriptionStatus, BadgeTone> = {
  active: 'positive',
  paused: 'warning',
  cancelled: 'neutral',
};

const STATUS_ICON_COLORS: Record<
  SubscriptionStatus,
  { color: keyof ThemeColors; background: keyof ThemeColors }
> = {
  active: { color: 'primaryText', background: 'primaryMuted' },
  paused: { color: 'textSecondary', background: 'surfaceMuted' },
  cancelled: { color: 'textSecondary', background: 'surfaceMuted' },
};

const DIVIDER_INSET = spacing.lg + 36 + spacing.md;
const NEW_HREF = '/subscription/new' as Href;

async function load(repositories: Repositories) {
  const subscriptions = await repositories.subscriptions.list();
  return { subscriptions, costs: activeSubscriptionCosts(subscriptions) };
}

export function SubscriptionsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const breakpoint = useBreakpoint();
  const { formatDate, formatMoney } = useLocaleFormat();
  const query = useDataQuery(useCallback((repositories: Repositories) => load(repositories), []));

  const add = () => router.push(NEW_HREF);
  const header = {
    title: t('nav.subscriptions'),
    subtitle: t('subscriptions.subtitle'),
    headerRight:
      breakpoint === 'compact' ? (
        <IconButton
          icon="add"
          variant="filled"
          color="primaryText"
          accessibilityLabel={t('subscriptions.add')}
          onPress={add}
        />
      ) : (
        <Button label={t('subscriptions.add')} icon="add" onPress={add} />
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

  const { subscriptions, costs } = query.data;
  const activeCount = subscriptions.filter((item) => item.status === 'active').length;

  if (subscriptions.length === 0) {
    return (
      <Screen {...header}>
        <Card padding="none">
          <EmptyState
            icon="repeat-outline"
            title={t('subscriptions.emptyTitle')}
            description={t('subscriptions.emptyDescription')}>
            <Button label={t('subscriptions.start')} icon="add" onPress={add} />
          </EmptyState>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen {...header}>
      {costs.length > 0 ? (
        <View style={styles.heroes}>
          {costs.map((cost) => (
            <HeroCard key={cost.currency} style={styles.hero}>
              <Text variant="overline" tone="heroMuted">
                {t('subscriptions.monthly')}
              </Text>
              <Text variant="amountHero" tone="hero" tabular numberOfLines={1} adjustsFontSizeToFit>
                {formatMoney({ amountMinor: cost.monthlyMinor, currency: cost.currency })}
              </Text>
              <View style={styles.heroRow}>
                <View style={[styles.heroChip, { backgroundColor: colors.heroSurface }]}>
                  <Text variant="footnote" tone="hero" tabular>
                    {`${t('subscriptions.yearly')}: ${formatMoney({
                      amountMinor: cost.yearlyMinor,
                      currency: cost.currency,
                    })}`}
                  </Text>
                </View>
                <Text variant="caption" tone="heroMuted">
                  {t('subscriptions.activeCount', { count: activeCount })}
                </Text>
              </View>
            </HeroCard>
          ))}
        </View>
      ) : null}
      <Card padding="xs">
        {subscriptions.map((item, index) => {
          const iconColors = STATUS_ICON_COLORS[item.status];
          return (
            <Fragment key={item.id}>
              {index > 0 ? <Divider inset={DIVIDER_INSET} /> : null}
              <ListItem
                title={item.name}
                subtitle={`${t('subscriptions.nextOn')}: ${formatDate(
                  calendarDateToLocalDate(item.nextOn),
                  'medium',
                )}`}
                icon="repeat-outline"
                iconColor={iconColors.color}
                iconBackground={iconColors.background}
                onPress={() => router.push(`/subscription/${item.id}` as Href)}
                trailing={
                  <View style={styles.trailing}>
                    <Amount
                      value={{ amountMinor: item.amount, currency: item.currency }}
                      variant="bodyStrong"
                    />
                    <Badge
                      label={t(`subscriptions.status.${item.status}`)}
                      tone={STATUS_TONE[item.status]}
                    />
                  </View>
                }
              />
            </Fragment>
          );
        })}
      </Card>
      <Text variant="caption" tone="tertiary">
        {t('subscriptions.activeOnly')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  heroes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  hero: { flexGrow: 1, flexBasis: 260, gap: spacing.sm },
  heroRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  heroChip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  trailing: { alignItems: 'flex-end', gap: spacing.xs },
});
