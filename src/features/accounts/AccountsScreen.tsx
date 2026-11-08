import { router } from 'expo-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { totalsByCurrency } from '@/core/finance';
import { useDataQuery, type AccountWithBalance, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Amount,
  Button,
  Card,
  CategoryIcon,
  Divider,
  EmptyState,
  HeroCard,
  IconButton,
  ListItem,
  Screen,
  Section,
  Text,
} from '@/ui/components';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { spacing, useTheme } from '@/ui/theme';

import { ACCOUNT_TYPE_COLORS, ACCOUNT_TYPE_ICONS } from '../finance/presentation';

const DIVIDER_INSET = spacing.lg + 36 + spacing.md;

const loadAccounts = (repositories: Repositories) =>
  repositories.accounts.listWithBalances({ includeArchived: true });

function AccountRows({ accounts }: { accounts: readonly AccountWithBalance[] }) {
  const { t } = useTranslation();
  return (
    <Card padding="xs">
      {accounts.map((account, index) => (
        <Fragment key={account.id}>
          {index > 0 ? <Divider inset={DIVIDER_INSET} /> : null}
          <ListItem
            leading={
              <CategoryIcon
                icon={ACCOUNT_TYPE_ICONS[account.type]}
                color={ACCOUNT_TYPE_COLORS[account.type]}
              />
            }
            title={account.name}
            subtitle={`${t(`accounts.types.${account.type}`)} · ${t('accounts.entryCount', { count: account.entryCount })}`}
            trailing={
              <Amount
                value={{ amountMinor: account.balance, currency: account.currency }}
                variant="bodyStrong"
              />
            }
            onPress={() => router.push({ pathname: '/account/[id]', params: { id: account.id } })}
          />
        </Fragment>
      ))}
    </Card>
  );
}

export function AccountsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatMoney } = useLocaleFormat();
  const breakpoint = useBreakpoint();
  const query = useDataQuery(loadAccounts);

  const accounts = query.data ?? [];
  const active = accounts.filter((account) => !account.archivedAt);
  const archived = accounts.filter((account) => account.archivedAt);
  const totals = [
    ...totalsByCurrency(
      active.map((account) => ({
        accountId: account.id,
        currency: account.currency,
        balance: account.balance,
      })),
    ),
  ];

  const add = () => router.push('/account/new');
  const headerRight =
    breakpoint === 'compact' ? (
      <IconButton
        icon="add"
        variant="filled"
        color="primaryText"
        accessibilityLabel={t('accounts.add')}
        onPress={add}
      />
    ) : (
      <Button label={t('accounts.add')} icon="add" onPress={add} />
    );

  return (
    <Screen
      title={t('accounts.title')}
      subtitle={t('modules.accounts.description')}
      headerRight={headerRight}>
      {!query.data ? (
        query.status === 'error' ? (
          <EmptyState icon="alert-circle-outline" title={t('errors.loadFailed')} />
        ) : (
          <ActivityIndicator color={colors.primary} />
        )
      ) : accounts.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon="wallet-outline"
            title={t('accounts.emptyTitle')}
            description={t('accounts.emptyDescription')}>
            <Button label={t('accounts.add')} icon="add" onPress={add} />
          </EmptyState>
        </Card>
      ) : (
        <>
          {totals.length > 0 ? (
            <View style={styles.totals}>
              {totals.map(([currency, total]) => (
                <HeroCard key={currency} style={styles.totalCard}>
                  <Text variant="overline" tone="heroMuted">
                    {t('accounts.totalLabel', { currency })}
                  </Text>
                  <Text
                    variant="amountHero"
                    tone="hero"
                    tabular
                    numberOfLines={1}
                    adjustsFontSizeToFit>
                    {formatMoney({ amountMinor: total, currency })}
                  </Text>
                </HeroCard>
              ))}
            </View>
          ) : null}
          {active.length > 0 ? <AccountRows accounts={active} /> : null}
          {archived.length > 0 ? (
            <Section title={t('accounts.archivedSection')}>
              <AccountRows accounts={archived} />
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  totals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  totalCard: {
    flexGrow: 1,
    flexBasis: 220,
    gap: spacing.xs,
  },
});
