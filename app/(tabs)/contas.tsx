import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AccountFormModal, AccountListItem } from '@/components/accounts';
import { AppHeader } from '@/components/layout';
import { EmptyState, ErrorState, RefetchingIndicator, ScreenContainer, Text } from '@/components/ui';
import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useDiagnosticScreen } from '@/hooks/useDiagnosticScreen';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { AccountWithBalance } from '@/lib/domain/account.types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

import { AccountDetailSheet } from '@/components/accounts/AccountDetailSheet';

export default function ContasScreen() {
  useDiagnosticScreen('accounts');

  const { data: transactions = [], isLoading: txLoading } = useTransactions('all');
  const {
    accounts,
    totalBalance,
    isLoading: accountsLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useAccountsWithBalances(transactions);

  const { contentBottomPadding } = useResponsiveLayout();
  const [formVisible, setFormVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountWithBalance | null>(null);

  const accountTransactions = useMemo(() => {
    if (!selectedAccount) return [];
    return transactions.filter((t) => t.accountId === selectedAccount.id);
  }, [transactions, selectedAccount]);

  const isLoading = accountsLoading || txLoading;

  const header = (
    <AppHeader
      action={{
        icon: (
          <SymbolView
            name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
            tintColor={colors.primary}
            size={26}
          />
        ),
        onPress: () => setFormVisible(true),
        accessibilityLabel: 'Nova conta',
      }}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.screen}>
        {header}
        <ScreenContainer applyBottomSafeInset={false}>
          <Text variant="caption" color="textMuted">
            A carregar contas...
          </Text>
        </ScreenContainer>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.centered}>
          <ErrorState context="dashboard" error={error} onRetry={() => refetch()} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {header}

      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
        contentContainerStyle={{ paddingBottom: contentBottomPadding }}>
        <ScreenContainer scrollable={false} applyBottomSafeInset={false}>
          <Text variant="label" color="textMuted" style={styles.sectionLabel}>
            CONTAS
          </Text>

          {accounts.length === 0 ? (
            <EmptyState
              icon={
                <SymbolView
                  name={{ ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' }}
                  tintColor={colors.primary}
                  size={40}
                />
              }
              title="Sem contas registadas"
              description="Adiciona as tuas contas bancárias para calcular saldos a partir dos movimentos."
              actionLabel="Criar conta"
              onAction={() => setFormVisible(true)}
            />
          ) : (
            <>
              {accounts.map((account) => (
                <AccountListItem
                  key={account.id}
                  account={account}
                  onPress={() => setSelectedAccount(account)}
                />
              ))}

              <View style={styles.totalRow}>
                <Text variant="bodyMedium" color="textMuted">
                  Total
                </Text>
                <Text variant="h2">{formatCurrency(totalBalance)}</Text>
              </View>
            </>
          )}

          <RefetchingIndicator visible={isRefetching} />
        </ScreenContainer>
      </ScrollView>

      <AccountFormModal visible={formVisible} onClose={() => setFormVisible(false)} />

      <AccountDetailSheet
        visible={selectedAccount !== null}
        account={selectedAccount}
        transactions={accountTransactions}
        onClose={() => setSelectedAccount(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sectionLabel: {
    marginBottom: spacing.md,
    letterSpacing: 1,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
