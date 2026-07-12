import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
} from '@/components/settings';
import { Button, Card, ErrorState, LoadingSpinner, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import {
  useBankConnections,
  useCreateBankLink,
  useFinalizeBankLink,
  useRevokeBankConnection,
  useSupportedBanks,
  useSyncBankConnection,
} from '@/hooks/queries/useBankConnections';
import type { BankConnection, BankConnectionAccount } from '@/lib/open-banking/types';
import { getOpenBankingRedirectUrl } from '@/lib/open-banking/gocardless.service';
import { spacing, useTheme, useThemedStyles } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme/types';
import { formatDateShort } from '@/lib/utils/format';

export default function BankConnectionsScreen() {
  const {
    data: connections,
    isLoading: connectionsLoading,
    isError: connectionsError,
    error: connectionsErrorValue,
    refetch: refetchConnections,
    isRefetching: connectionsRefetching,
  } = useBankConnections();
  const {
    data: banks,
    isLoading: banksLoading,
    isError: banksError,
    error: banksErrorValue,
    refetch: refetchBanks,
    isRefetching: banksRefetching,
  } = useSupportedBanks();
  const createLink = useCreateBankLink();
  const finalizeLink = useFinalizeBankLink();
  const revokeConnection = useRevokeBankConnection();
  const syncConnection = useSyncBankConnection();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [search, setSearch] = useState('');
  const [linkingBankId, setLinkingBankId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const filteredBanks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return banks ?? [];
    return (banks ?? []).filter((bank) => bank.name.toLowerCase().includes(query));
  }, [banks, search]);

  async function handleLinkBank(institutionId: string) {
    setLinkingBankId(institutionId);
    try {
      const result = await createLink.mutateAsync(institutionId);
      if (!result.link) throw new Error('Link bancário indisponível');

      const redirectUrl = getOpenBankingRedirectUrl();
      const browserResult = await WebBrowser.openAuthSessionAsync(result.link, redirectUrl);

      if (browserResult.type === 'success' || browserResult.type === 'dismiss') {
        const finalized = await finalizeLink.mutateAsync(result.requisitionId);
        if (finalized.sync?.imported) {
          showToast(`${finalized.sync.imported} movimentos importados`, 'success');
        } else {
          showToast('Conta bancária ligada', 'success');
        }
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Não foi possível ligar o banco',
        'error',
      );
    } finally {
      setLinkingBankId(null);
    }
  }

  async function handleRenew(connection: BankConnection) {
    setLinkingBankId(connection.institutionId);
    try {
      const result = await createLink.mutateAsync(connection.institutionId);
      if (!result.link) throw new Error('Link bancário indisponível');

      const redirectUrl = getOpenBankingRedirectUrl();
      const browserResult = await WebBrowser.openAuthSessionAsync(result.link, redirectUrl);

      if (browserResult.type === 'success' || browserResult.type === 'dismiss') {
        const finalized = await finalizeLink.mutateAsync(result.requisitionId);
        if (finalized.sync?.imported) {
          showToast(`${finalized.sync.imported} movimentos importados`, 'success');
        } else {
          showToast('Consentimento renovado', 'success');
        }
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Não foi possível renovar a ligação',
        'error',
      );
    } finally {
      setLinkingBankId(null);
    }
  }

  async function handleSync(connection: BankConnection) {
    setSyncingId(connection.id);
    try {
      const result = await syncConnection.mutateAsync(connection.id);
      if (result.ok) {
        showToast(
          result.imported
            ? `${result.imported} movimentos novos importados`
            : 'Sincronização concluída — sem movimentos novos',
          'success',
        );
      } else {
        showToast(result.error ?? 'Sincronização falhou', 'error');
      }
    } finally {
      setSyncingId(null);
    }
  }

  function handleRevoke(connection: BankConnection) {
    Alert.alert(
      'Desligar conta?',
      `Remove a ligação a ${connection.institutionName}. Os movimentos já importados mantêm-se.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desligar',
          style: 'destructive',
          onPress: () => {
            void revokeConnection
              .mutateAsync(connection.id)
              .then(() => showToast('Ligação removida', 'success'))
              .catch(() => showToast('Não foi possível desligar', 'error'));
          },
        },
      ],
    );
  }

  const linked = (connections ?? []).filter((item) => item.status === 'linked');
  const pending = (connections ?? []).filter((item) => item.status === 'pending');
  const expired = (connections ?? []).filter((item) => item.status === 'expired');

  const loadError = connectionsError || banksError;
  const loadErrorValue = connectionsErrorValue ?? banksErrorValue;

  async function handleRetryLoad() {
    await Promise.all([refetchConnections(), refetchBanks()]);
  }

  if (loadError && !connectionsLoading && !banksLoading) {
    return (
      <SettingsScreenLayout
        title="Ligações bancárias"
        subtitle="Importação automática via Open Banking (complemento à entrada manual)">
        <ErrorState
          context="generic"
          error={loadErrorValue}
          onRetry={() => void handleRetryLoad()}
          retryLoading={connectionsRefetching || banksRefetching}
        />
      </SettingsScreenLayout>
    );
  }

  return (
    <SettingsScreenLayout
      title="Ligações bancárias"
      subtitle="Importação automática via Open Banking (complemento à entrada manual)">
      <SettingsHero
        icon={{ ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' }}
        title="Open Banking"
        description="Liga o teu banco português para importar movimentos automaticamente. Podes continuar a registar despesas manualmente — incluindo talões OCR."
      />

      <Card variant="outlined" style={styles.section}>
        <Text variant="h3">Contas ligadas</Text>
        {connectionsLoading ? (
          <LoadingSpinner message="A carregar ligações..." />
        ) : linked.length === 0 && pending.length === 0 && expired.length === 0 ? (
          <Text variant="body" color="textSecondary">
            Ainda não tens bancos ligados. Escolhe um banco abaixo para começar.
          </Text>
        ) : (
          <View style={styles.connectionList}>
            {[...linked, ...pending, ...expired].map((connection) => (
              <View key={connection.id} style={styles.connectionRow}>
                <View style={styles.connectionMeta}>
                  <Text variant="bodyMedium">{connection.institutionName}</Text>
                  <Text variant="caption" color="textMuted">
                    {connectionStatusLabel(connection)}
                  </Text>
                  <ConnectionSyncSummary connection={connection} />
                  {connection.consentExpiresAt ? (
                    <ConsentExpiryBadge expiresAt={connection.consentExpiresAt} />
                  ) : null}
                  {connection.lastSyncStatus === 'failed' ? (
                    <View style={styles.syncFailedBadge}>
                      <Text variant="caption" style={styles.syncFailedText}>
                        Última sincronização falhou
                        {connection.lastSyncSource === 'auto' ? ' (automática)' : ''}
                      </Text>
                    </View>
                  ) : null}
                  {connection.accounts.length > 0 ? (
                    <View style={styles.accountList}>
                      {connection.accounts.map((account) => (
                        <AccountSyncRow key={account.id} account={account} />
                      ))}
                    </View>
                  ) : null}
                </View>
                <View style={styles.connectionActions}>
                  {connection.status === 'linked' ? (
                    <Button
                      label="Sync"
                      size="sm"
                      variant="secondary"
                      loading={syncingId === connection.id}
                      onPress={() => void handleSync(connection)}
                    />
                  ) : null}
                  {connection.status === 'expired' ||
                  (connection.consentExpiresAt && daysUntil(connection.consentExpiresAt) <= 7) ? (
                    <Button
                      label="Renovar"
                      size="sm"
                      variant="primary"
                      loading={linkingBankId === connection.institutionId}
                      onPress={() => void handleRenew(connection)}
                    />
                  ) : null}
                  <Button
                    label="Desligar"
                    size="sm"
                    variant="ghost"
                    onPress={() => handleRevoke(connection)}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card variant="elevated" style={styles.section}>
        <Text variant="h3">Ligar banco (Portugal)</Text>
        <Text variant="caption" color="textMuted" style={styles.helper}>
          Serás redireccionado para o site seguro do teu banco para autorizar o acesso.
        </Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar banco..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
        {banksLoading ? (
          <LoadingSpinner message="A carregar bancos..." />
        ) : (
          <ScrollView style={styles.bankList} nestedScrollEnabled>
            {filteredBanks.map((bank) => (
              <Pressable
                key={bank.id}
                onPress={() => void handleLinkBank(bank.id)}
                disabled={linkingBankId !== null}
                style={({ pressed }) => [
                  styles.bankRow,
                  pressed && styles.bankRowPressed,
                  linkingBankId === bank.id && styles.bankRowDisabled,
                ]}>
                <Text variant="bodyMedium">{bank.name}</Text>
                {linkingBankId === bank.id ? (
                  <Text variant="caption" color="primary">
                    A abrir...
                  </Text>
                ) : (
                  <Text variant="caption" color="textMuted">
                    Ligar
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </Card>
    </SettingsScreenLayout>
  );
}

function connectionStatusLabel(connection: BankConnection): string {
  if (connection.status === 'pending') return 'A aguardar autorização';
  if (connection.status === 'linked') return 'Ligada · sync automática a cada 6 horas';
  if (connection.status === 'expired') return 'Consentimento expirado';
  if (connection.status === 'error') return 'Erro na ligação';
  return connection.status;
}

function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function ConnectionSyncSummary({ connection }: { connection: BankConnection }) {
  const autoLabel = connection.lastAutoSyncAt
    ? `Última sync automática: ${formatDateShort(connection.lastAutoSyncAt)}`
    : 'Sync automática ainda não executada';
  const manualLabel =
    connection.lastSyncAt && connection.lastSyncSource === 'manual'
      ? ` · manual: ${formatDateShort(connection.lastSyncAt)}`
      : '';

  return (
    <Text variant="caption" color="textSecondary">
      {autoLabel}
      {manualLabel}
    </Text>
  );
}

function ConsentExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const { colors } = useTheme();
  const daysLeft = daysUntil(expiresAt);
  if (daysLeft > 7) return null;

  const label =
    daysLeft <= 0
      ? 'Consentimento expirado — renova para continuar'
      : `Consentimento expira em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`;

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: `${colors.warning}22`,
        borderRadius: 999,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: `${colors.warning}55`,
      }}>
      <Text variant="caption" style={{ color: colors.warning, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

function AccountSyncRow({ account }: { account: BankConnectionAccount }) {
  const label = account.name ?? account.iban ?? 'Conta';
  const autoSync = account.lastAutoSyncAt
    ? `sync auto ${formatDateShort(account.lastAutoSyncAt)}`
    : 'sem sync auto';

  return (
    <Text variant="caption" color="textMuted">
      {label} · {autoSync}
      {account.lastAutoSyncStatus === 'skipped' ? ' (limite API)' : ''}
    </Text>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    section: {
      gap: spacing.md,
    },
    helper: {
      lineHeight: 20,
    },
    connectionList: {
      gap: spacing.md,
    },
    connectionRow: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'flex-start',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    connectionMeta: {
      flex: 1,
      gap: spacing.xs,
    },
    accountList: {
      gap: 2,
      marginTop: spacing.xs,
    },
    connectionActions: {
      gap: spacing.xs,
      alignItems: 'flex-end',
    },
    syncFailedBadge: {
      alignSelf: 'flex-start',
      backgroundColor: `${colors.warning}22`,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: `${colors.warning}55`,
    },
    syncFailedText: {
      color: colors.warning,
      fontWeight: '600',
    },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    bankList: {
      maxHeight: 320,
    },
    bankRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    bankRowPressed: {
      opacity: 0.85,
    },
    bankRowDisabled: {
      opacity: 0.6,
    },
  });
}
