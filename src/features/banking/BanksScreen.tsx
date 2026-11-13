import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { Badge, Button, Card, Dialog, Divider, FormScreen, ListItem, Text } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { useAuth } from '../account/AuthProvider';
import { closeModal } from '../finance/navigation';
import { useToday } from '../finance/useToday';
import {
  disconnectBank,
  loadBankConnections,
  refreshBankConnection,
  type BankClientError,
  type BankConnection,
} from './open-banking-client';

const STATUS_TONE = { connected: 'positive', expired: 'warning', error: 'negative' } as const;

/** Bancos ligados (ADR-069): saldos, associação às contas da app, atualizar e desligar. */
export function BanksScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatMoney, formatDate, formatDateTime } = useLocaleFormat();
  const { client } = useAuth();
  const repositories = useRepositories();
  const today = useToday();
  const [connections, setConnections] = useState<BankConnection[] | null>(null);
  const [error, setError] = useState<BankClientError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<BankConnection | null>(null);
  const appAccounts = useDataQuery(
    useCallback((repos: Repositories) => repos.accounts.listWithBalances(), []),
  );

  const reload = useCallback(async () => {
    if (!client) return;
    const loaded = await loadBankConnections(client);
    setConnections(loaded ?? []);
    if (!loaded) setError('unavailable');
  }, [client]);

  // Ao voltar de associar uma conta (ou do banco), os dados mudaram.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const refresh = async (connection: BankConnection) => {
    if (!client) return;
    setBusy(connection.id);
    setError(null);
    setNotice(null);
    const result = await refreshBankConnection(
      client,
      repositories,
      connection,
      today,
      connection.aspsp_name,
      { force: true },
    );
    setBusy(null);
    if (!result.ok) setError(result.error);
    else
      setNotice(
        result.value.imported > 0
          ? t('banking.imported', { count: result.value.imported })
          : t('banking.upToDate'),
      );
    await reload();
  };

  const disconnect = async (connection: BankConnection) => {
    setConfirm(null);
    if (!client) return;
    setBusy(connection.id);
    const result = await disconnectBank(client, connection.id);
    setBusy(null);
    if (!result.ok) setError(result.error);
    await reload();
  };

  const appAccount = (id: string | null) =>
    id ? appAccounts.data?.find((account) => account.id === id) : undefined;

  return (
    <FormScreen
      title={t('banking.title')}
      closeLabel={t('common.close')}
      onClose={() => closeModal('/settings')}>
      <View style={styles.body}>
        <Text variant="callout" tone="secondary">
          {t('banking.intro')}
        </Text>
        {error ? (
          <Text variant="footnote" tone="negative" accessibilityLiveRegion="polite">
            {t(`banking.errors.${error}`)}
          </Text>
        ) : null}
        {notice ? (
          <Text variant="footnote" tone="positive" accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}

        {connections === null ? (
          <ActivityIndicator color={colors.primary} accessibilityLabel={t('common.loading')} />
        ) : connections.length === 0 ? (
          <Text variant="body" tone="secondary">
            {t('banking.empty')}
          </Text>
        ) : (
          connections.map((connection) => (
            <Card key={connection.id} padding="xs">
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <Text variant="bodyStrong" accessibilityRole="header">
                    {connection.aspsp_name}
                  </Text>
                  <Text variant="footnote" tone="tertiary">
                    {connection.status === 'expired'
                      ? t('banking.errors.expired')
                      : t('banking.validUntil', {
                          date: formatDate(new Date(connection.valid_until)),
                        })}
                  </Text>
                  <Text variant="footnote" tone="tertiary">
                    {connection.last_sync_at
                      ? t('banking.lastSync', {
                          date: formatDateTime(new Date(connection.last_sync_at)),
                        })
                      : t('banking.neverSynced')}
                  </Text>
                </View>
                <Badge
                  label={t(`banking.status.${connection.status}`)}
                  tone={STATUS_TONE[connection.status]}
                />
              </View>
              {connection.accounts.map((account) => {
                const linked = appAccount(account.app_account_id);
                const label = `${account.name ?? t('banking.account.unnamed')}${
                  account.iban_last4 ? ` ·· ${account.iban_last4}` : ''
                }`;
                const balances = [
                  account.balance !== null
                    ? t('banking.account.bankBalance', {
                        amount: formatMoney({
                          amountMinor: account.balance,
                          currency: account.currency,
                        }),
                      })
                    : null,
                  linked
                    ? t('banking.account.appBalance', {
                        amount: formatMoney({
                          amountMinor: linked.balance,
                          currency: linked.currency,
                        }),
                      })
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <View key={account.id}>
                    <Divider inset={spacing.lg} />
                    <ListItem
                      icon="business-outline"
                      iconColor="textSecondary"
                      iconBackground="surfaceMuted"
                      title={label}
                      subtitle={`${
                        linked
                          ? t('banking.account.linkedTo', { account: linked.name })
                          : t('banking.account.notLinked')
                      }${balances ? `\n${balances}` : ''}`}
                      onPress={() =>
                        router.push(`/integrations/bank-account/${account.id}` as Href)
                      }
                    />
                  </View>
                );
              })}
              <Divider inset={spacing.lg} />
              <View style={styles.actions}>
                {connection.status === 'connected' ? (
                  <Button
                    label={t('banking.refresh')}
                    icon="refresh"
                    variant="secondary"
                    loading={busy === connection.id}
                    disabled={busy !== null}
                    onPress={() => void refresh(connection)}
                  />
                ) : (
                  <Button
                    label={t('banking.reconnect')}
                    icon="refresh"
                    variant="secondary"
                    disabled={busy !== null}
                    onPress={() => router.push('/integrations/bank-link' as Href)}
                  />
                )}
                <Button
                  label={t('banking.disconnect')}
                  variant="ghost"
                  disabled={busy !== null}
                  onPress={() => setConfirm(connection)}
                />
              </View>
            </Card>
          ))
        )}

        <Button
          label={t('banking.connect')}
          icon="add"
          onPress={() => router.push('/integrations/bank-link' as Href)}
        />
        <Text variant="footnote" tone="tertiary">
          {t('banking.provider')}
        </Text>
      </View>

      <Dialog
        visible={confirm !== null}
        title={t('banking.disconnectTitle', { bank: confirm?.aspsp_name ?? '' })}
        message={t('banking.disconnectMessage')}
        onDismiss={() => setConfirm(null)}
        actions={[
          {
            label: t('banking.disconnect'),
            variant: 'destructive',
            onPress: () => (confirm ? void disconnect(confirm) : undefined),
          },
          { label: t('common.cancel'), variant: 'ghost', onPress: () => setConfirm(null) },
        ]}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.xxs },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
