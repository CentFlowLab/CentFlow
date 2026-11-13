import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { BankAccountKind } from '@/core/banking/open-banking';
import { addDays, type AccountType } from '@/core/finance';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { Card, Divider, FormScreen, ListItem, Section, Text, TextField } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { useAuth } from '../account/AuthProvider';
import { useSync } from '../account/SyncProvider';
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
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [newName, setNewName] = useState<string | null>(null);
  const [linkedElsewhere, setLinkedElsewhere] = useState<ReadonlySet<string>>(new Set());
  const { syncNow } = useSync();
  const appAccounts = useDataQuery(
    useCallback((repos: Repositories) => repos.accounts.listWithBalances(), []),
  );

  useEffect(() => {
    if (!client) return;
    let alive = true;
    void loadBankConnections(client).then((connections) => {
      if (!alive) return;
      const others = new Set<string>();
      let found: { row: BankAccountRow; bank: string } | null = null;
      for (const connection of connections ?? []) {
        for (const item of connection.accounts) {
          if (item.id === id) found = { row: item, bank: connection.aspsp_name };
          else if (item.app_account_id) others.add(item.app_account_id);
        }
      }
      setLinkedElsewhere(others);
      if (found) setAccount(found);
      else setMissing(true);
    });
    return () => {
      alive = false;
    };
  }, [client, id]);

  const close = () => closeModal('/integrations/banks');

  const linkedApp = (appAccounts.data ?? []).find(
    (item) => item.id === account?.row.app_account_id,
  );
  const bankBalance = account?.row.balance ?? null;

  /**
   * Põe o saldo da app igual ao do banco mudando o saldo inicial da conta (os movimentos ficam
   * como estão). Serve quando a conta já tinha movimentos apagados ou o banco mostra a dívida de
   * um cartão como valor positivo.
   */
  const adjustTo = async (target: number) => {
    if (!linkedApp) return;
    setBusy(true);
    setFailed(false);
    try {
      const current = await repositories.accounts.get(linkedApp.id);
      if (!current) throw new Error('missing');
      await repositories.accounts.update(current.id, {
        name: current.name,
        type: current.type,
        currency: current.currency,
        initialBalance: current.initialBalance + (target - linkedApp.balance),
        creditLimit: current.creditLimit,
        institution: current.institution,
        statementDay: current.statementDay,
        dueDay: current.dueDay,
        paymentAccountId: current.paymentAccountId,
        color: current.color,
      });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  /** "Santander Totta Cartão de crédito"; só o banco quando não se sabe o que a conta é. */
  const suggestName = (bank: string, kind: BankAccountKind | null) =>
    kind ? `${bank} ${t(`banking.associate.kinds.${kind}`)}` : bank;
  const suggestedName = account ? suggestName(account.bank, account.row.kind) : '';

  const save = async (appAccountId: string | null, importFrom: string | null) => {
    if (!client || !account) return;
    setBusy(true);
    setFailed(false);
    let ok = await linkBankAccount(client, account.row.id, appAccountId, importFrom);
    if (!ok && appAccountId) {
      // O servidor só aceita contas que já recebeu: sincronizar e tentar outra vez.
      await syncNow();
      ok = await linkBankAccount(client, account.row.id, appAccountId, importFrom);
    }
    setBusy(false);
    if (ok) close();
    else setFailed(true);
  };

  const createAccount = async () => {
    if (!account) return;
    setBusy(true);
    setFailed(false);
    try {
      // Uma nova tentativa usa a conta já criada, em vez de criar outra igual.
      let accountId = createdId;
      if (!accountId) {
        const created = await repositories.accounts.create({
          name: ((newName ?? '').trim() || suggestedName).slice(0, 60),
          type: appTypeFor(account.row.kind),
          currency: account.row.currency,
          initialBalance: account.row.balance ?? 0,
          institution: account.bank.slice(0, 60),
        });
        accountId = created.id;
        setCreatedId(accountId);
      }
      await syncNow();
      await save(accountId, addDays(today, 1));
    } catch {
      setBusy(false);
      setFailed(true);
    }
  };

  // Cada conta da app recebe movimentos de uma só conta do banco.
  const sameCurrency = (appAccounts.data ?? []).filter(
    (item) =>
      item.currency === account?.row.currency && !item.archivedAt && !linkedElsewhere.has(item.id),
  );
  const alreadyLinked = Boolean(account?.row.app_account_id);
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
          {linkedApp &&
          bankBalance !== null &&
          Math.abs(linkedApp.balance) !== Math.abs(bankBalance) ? (
            <Section title={t('banking.associate.adjustTitle')}>
              <Text variant="footnote" tone="secondary">
                {t('banking.associate.adjustHint', {
                  app: formatMoney({
                    amountMinor: linkedApp.balance,
                    currency: linkedApp.currency,
                  }),
                  bank: formatMoney({ amountMinor: bankBalance, currency: linkedApp.currency }),
                })}
              </Text>
              <Card padding="xs">
                <ListItem
                  icon="checkmark-circle-outline"
                  iconColor="primary"
                  iconBackground="primaryMuted"
                  title={t('banking.associate.adjustToBank', {
                    amount: formatMoney({ amountMinor: bankBalance, currency: linkedApp.currency }),
                  })}
                  showChevron={false}
                  onPress={busy ? undefined : () => void adjustTo(bankBalance)}
                />
                {bankBalance > 0 ? (
                  <>
                    <Divider inset={spacing.lg} />
                    <ListItem
                      icon="card-outline"
                      iconColor="textSecondary"
                      iconBackground="surfaceMuted"
                      title={t('banking.associate.adjustAsDebt', {
                        amount: formatMoney({
                          amountMinor: -bankBalance,
                          currency: linkedApp.currency,
                        }),
                      })}
                      subtitle={t('banking.associate.adjustAsDebtHint')}
                      showChevron={false}
                      onPress={busy ? undefined : () => void adjustTo(-bankBalance)}
                    />
                  </>
                ) : null}
              </Card>
            </Section>
          ) : null}
          {alreadyLinked ? null : (
            <TextField
              label={t('banking.associate.nameLabel')}
              helperText={t('banking.associate.nameHint')}
              value={newName ?? suggestedName}
              onChangeText={setNewName}
              maxLength={60}
              editable={!busy && !createdId}
            />
          )}
          {alreadyLinked ? null : (
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
          )}
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

function appTypeFor(kind: BankAccountKind | null): AccountType {
  if (kind === 'card') return 'card';
  if (kind === 'savings') return 'savings';
  return 'bank';
}
