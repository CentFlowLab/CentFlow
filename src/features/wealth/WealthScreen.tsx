import { router, type Href } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { isLiabilityType, wealthTotals, type WealthItem } from '@/core/finance';
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
  ListItem,
  Screen,
  Text,
} from '@/ui/components';
import type { IconName } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { useToday } from '../finance/useToday';
import { NetWorthHistoryCard } from './NetWorthHistoryCard';

const ICONS: Record<WealthItem['type'], IconName> = {
  property: 'home-outline',
  investment: 'trending-up-outline',
  retirement: 'shield-checkmark-outline',
  valuables: 'diamond-outline',
  other_asset: 'cube-outline',
  mortgage: 'business-outline',
  loan: 'cash-outline',
  credit: 'card-outline',
  other_debt: 'receipt-outline',
};

export function WealthScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDate, formatMoney } = useLocaleFormat();
  const today = useToday();
  const query = useDataQuery(
    useCallback((repositories: Repositories) => repositories.wealth.list(), []),
  );
  const add = () => router.push('/wealth/new' as Href);

  const header = {
    title: t('nav.wealth'),
    subtitle: t('wealth.subtitle'),
    headerRight: (
      <IconButton icon="add" variant="filled" accessibilityLabel={t('wealth.add')} onPress={add} />
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

  const items = query.data;
  if (items.length === 0) {
    return (
      <Screen {...header}>
        <EmptyState
          icon="business-outline"
          title={t('wealth.emptyTitle')}
          description={t('wealth.emptyDescription')}>
          <Button label={t('wealth.start')} onPress={add} />
        </EmptyState>
        <NetWorthHistoryCard today={today} />
      </Screen>
    );
  }

  const totals = wealthTotals(items);
  const groups = [
    { key: 'assets', rows: items.filter((item) => !isLiabilityType(item.type)) },
    { key: 'liabilities', rows: items.filter((item) => isLiabilityType(item.type)) },
  ] as const;

  return (
    <Screen {...header}>
      <View style={styles.body}>
        {totals.map((total) => (
          <HeroCard key={total.currency} style={styles.hero}>
            <Text variant="overline" tone="heroMuted">
              {t('wealth.netWorth', { currency: total.currency })}
            </Text>
            <Text
              variant="amountHero"
              tone={total.net < 0 ? 'heroNegative' : 'hero'}
              tabular
              numberOfLines={1}
              adjustsFontSizeToFit>
              {formatMoney({ amountMinor: total.net, currency: total.currency })}
            </Text>
            <View style={styles.heroRow}>
              <View style={styles.heroCell}>
                <Icon name="arrow-up" size={14} color="heroPositive" />
                <Text variant="footnote" tone="heroPositive" tabular>
                  {formatMoney({ amountMinor: total.assets, currency: total.currency })}
                </Text>
                <Text variant="caption" tone="heroMuted">
                  {t('wealth.assets')}
                </Text>
              </View>
              <View style={styles.heroCell}>
                <Icon name="arrow-down" size={14} color="heroNegative" />
                <Text variant="footnote" tone="heroNegative" tabular>
                  {formatMoney({ amountMinor: total.liabilities, currency: total.currency })}
                </Text>
                <Text variant="caption" tone="heroMuted">
                  {t('wealth.liabilities')}
                </Text>
              </View>
            </View>
          </HeroCard>
        ))}
        <NetWorthHistoryCard today={today} />
        {groups.map((group) =>
          group.rows.length === 0 ? null : (
            <View key={group.key} style={styles.group}>
              <Text variant="overline" tone="secondary">
                {t(`wealth.${group.key}`)}
              </Text>
              <Card padding="xs">
                {group.rows.map((item) => (
                  <ListItem
                    key={item.id}
                    title={item.name}
                    subtitle={`${t(`wealth.types.${item.type}`)} · ${formatDate(
                      new Date(`${item.valuedOn}T12:00:00`),
                      'medium',
                    )}`}
                    icon={ICONS[item.type]}
                    onPress={() => router.push(`/wealth/${item.id}` as Href)}
                    trailing={
                      <Amount
                        value={{ amountMinor: item.amount, currency: item.currency }}
                        variant="amount"
                      />
                    }
                  />
                ))}
              </Card>
            </View>
          ),
        )}
        <Text variant="caption" tone="tertiary">
          {t('wealth.doesNotChangeBalances')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  body: { gap: spacing.lg },
  group: { gap: spacing.sm },
  hero: { gap: spacing.sm },
  heroRow: { flexDirection: 'row', gap: spacing.xl, flexWrap: 'wrap' },
  heroCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
