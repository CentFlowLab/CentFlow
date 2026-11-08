import { router, type Href } from 'expo-router';
import { useCallback } from 'react';
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
  EmptyState,
  IconButton,
  ListItem,
  Screen,
  Text,
  type BadgeTone,
} from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

const STATUS_TONE: Record<SubscriptionStatus, BadgeTone> = {
  active: 'positive',
  paused: 'warning',
  cancelled: 'neutral',
};

async function load(repositories: Repositories) {
  const subscriptions = await repositories.subscriptions.list();
  return { subscriptions, costs: activeSubscriptionCosts(subscriptions) };
}

export function SubscriptionsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDate } = useLocaleFormat();
  const query = useDataQuery(useCallback((repositories: Repositories) => load(repositories), []));

  const header = {
    title: t('nav.subscriptions'),
    subtitle: t('subscriptions.subtitle'),
    headerRight: (
      <IconButton
        icon="add"
        variant="filled"
        accessibilityLabel={t('subscriptions.add')}
        onPress={() => router.push('/subscription/new' as Href)}
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

  const { subscriptions, costs } = query.data;

  return (
    <Screen {...header}>
      <View style={styles.body}>
        {subscriptions.length === 0 ? (
          <EmptyState
            icon="repeat-outline"
            title={t('subscriptions.emptyTitle')}
            description={t('subscriptions.emptyDescription')}>
            <Button
              label={t('subscriptions.start')}
              onPress={() => router.push('/subscription/new' as Href)}
            />
          </EmptyState>
        ) : (
          <>
            <Card>
              <View style={styles.totals}>
                {costs.map((cost) => (
                  <View key={cost.currency} style={styles.totalRow}>
                    <View style={styles.total}>
                      <Text variant="footnote" tone="secondary">
                        {t('subscriptions.monthly')}
                      </Text>
                      <Amount value={{ amountMinor: cost.monthlyMinor, currency: cost.currency }} />
                    </View>
                    <View style={styles.total}>
                      <Text variant="footnote" tone="secondary">
                        {t('subscriptions.yearly')}
                      </Text>
                      <Amount value={{ amountMinor: cost.yearlyMinor, currency: cost.currency }} />
                    </View>
                  </View>
                ))}
                <Text variant="caption" tone="tertiary">
                  {t('subscriptions.activeOnly')}
                </Text>
              </View>
            </Card>
            <Card padding="xs">
              {subscriptions.map((item) => (
                <ListItem
                  key={item.id}
                  title={item.name}
                  subtitle={t('subscriptions.nextOn')}
                  icon="repeat-outline"
                  onPress={() => router.push(`/subscription/${item.id}` as Href)}
                  trailing={
                    <View style={styles.trailing}>
                      <Amount
                        value={{ amountMinor: item.amount, currency: item.currency }}
                        variant="amount"
                      />
                      <Badge
                        label={t(`subscriptions.status.${item.status}`)}
                        tone={STATUS_TONE[item.status]}
                      />
                      <Text variant="caption" tone="tertiary">
                        {formatDate(calendarDateToLocalDate(item.nextOn), 'medium')}
                      </Text>
                    </View>
                  }
                />
              ))}
            </Card>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  body: { gap: spacing.lg },
  totals: { gap: spacing.md },
  totalRow: { flexDirection: 'row', gap: spacing.lg },
  total: { flex: 1, gap: spacing.xxs },
  trailing: { alignItems: 'flex-end', gap: spacing.xxs },
});
