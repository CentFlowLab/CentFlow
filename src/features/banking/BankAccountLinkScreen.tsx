import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { addDays } from '@/core/finance';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { Card, Divider, FormScreen, ListItem, Section, Text } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { useAuth } from '../account/AuthProvider';
import { closeModal } from '../finance/navigation';
import { useToday } from '../finance/useToday';
import { linkBankAccount, loadBankConnections, type BankAccountRow } from './open-banking-client';

/**
 * Para que conta da app vão os movimentos de uma conta do banco. Uma conta nova começa com o
 * saldo atual do banco e recebe os movimentos a partir de amanhã (os de hoje já estão no saldo);
 * uma conta existente recebe-os a partir de hoje, sem repetir os registados à mão.
 */
export function BankAccountLinkScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatMoney } = useLocaleFormat();
  const { client } = useAuth();
  const repositories = useRepositories();
  const today = useToday();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [account, setAccount] = useState<{ row: BankAccountRow; bank: string } | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const appAccounts = useDataQuery(
    useCallback((repos: Repositories) => repos.accounts.listWithBalances(), []),
  );

  useEffect(() => {
    if (!client) return;
    let alive = true;
    void loadBankConnections(client).then((connections) => {
      if (!alive) return;
      for (const connection of connections ?? []) {
        const row = connection.accounts.find((item) => item.id === id);
        if (row) {
          setAccount({ row, bank: connection.aspsp_name });
          return;
        }
      }
      setMissing(true);
    });
    return () => {
      alive = false;
    };
  }, [client, id]);

  const close = () => closeModal('/integrations/banks');

  const save = async (appAccountId: string | null, importFrom: string | null) => {
    if (!client || !account) return;
    setBusy(true);
    setFailed(false);
    const ok = await linkBankAccount(client, account.row.id, appAccountId, importFrom);
    setBusy(false);
    if (ok) close();
    else setFailed(true);
  };

  const createAccount = async () => {
    if (!account) return;
    setBusy(true);
    try {
      const created = await repositories.accounts.create({
        name: `${account.row.name ?? account.bank}`.slice(0, 60),
        type: 'bank',
        currency: account.row.currency,
        initialBalance: account.row.balance ?? 0,
        institution: account.bank.slice(0, 60),
      });
      await save(created.id, addDays(today, 1));
    } catch {
      setBusy(false);
      setFailed(true);
    }
  };

  const sameCurrency = (appAccounts.data ?? []).filter(
    (item) => item.currency === account?.row.currency && !item.archivedAt,
  );
  const bankLabel = account
    ? `${account.row.name ?? t('banking.account.unnamed')}${
        account.row.iban_last4 ? ` ·· ${account.row.iban_last4}` : ''
      }`
    : '';

  return (
    <FormScreen title={t('banking.associate.title')} closeLabel={t('common.close')} onClose={close}>
      {!account ? (
        missing ? (
          <Text variant="callout" tone="negative">
            {t('banking.errors.invalid')}
          </Text>
        ) : (
          <ActivityIndicator color={colors.primary} accessibilityLabel={t('common.loading')} />
        )
      ) : (
        <View style={styles.body}>
          <View style={styles.title}>
            <Text variant="title3" accessibilityRole="header">
              {bankLabel}
            </Text>
            <Text variant="footnote" tone="tertiary">
              {account.bank}
              {account.row.balance !== null
                ? ` · ${formatMoney({ amountMinor: account.row.balance, currency: account.row.currency })}`
                : ''}
            </Text>
          </View>
          <Text variant="callout" tone="secondary">
            {t('banking.associate.intro')}
          </Text>
          {failed ? (
            <Text variant="footnote" tone="negative" accessibilityLiveRegion="polite">
              {t('banking.associate.failed')}
            </Text>
          ) : null}
          <Card padding="xs">
            <ListItem
              icon="add-circle-outline"
              iconColor="primary"
              iconBackground="primaryMuted"
              title={t('banking.associate.create')}
              subtitle={t('banking.associate.createHint')}
              onPress={busy ? undefined : () => void createAccount()}
            />
          </Card>
          {sameCurrency.length > 0 ? (
            <Section title={t('banking.associate.existing', { currency: account.row.currency })}>
              <Card padding="xs">
                {sameCurrency.map((item, index) => (
                  <View key={item.id}>
                    {index > 0 ? <Divider inset={spacing.lg} /> : null}
                    <ListItem
                      icon="wallet-outline"
                      iconColor="textSecondary"
                      iconBackground="surfaceMuted"
                      title={item.name}
                      subtitle={formatMoney({ amountMinor: item.balance, currency: item.currency })}
                      selected={item.id === account.row.app_account_id}
                      onPress={busy ? undefined : () => void save(item.id, today)}
                    />
                  </View>
                ))}
              </Card>
            </Section>
          ) : null}
          {account.row.app_account_id ? (
            <Card padding="xs">
              <ListItem
                icon="close-circle-outline"
                iconColor="textSecondary"
                iconBackground="surfaceMuted"
                title={t('banking.associate.none')}
                showChevron={false}
                onPress={busy ? undefined : () => void save(null, null)}
              />
            </Card>
          ) : null}
          {busy ? (
            <ActivityIndicator color={colors.primary} accessibilityLabel={t('common.loading')} />
          ) : null}
        </View>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg },
  title: { gap: spacing.xxs },
});
