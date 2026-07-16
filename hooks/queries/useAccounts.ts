import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAccountData,
  deleteAccountData,
  fetchAccountsData,
  updateAccountData,
} from '@/lib/api/services/accounts.service';
import { queryKeys } from '@/lib/api/keys';
import { invalidateAssetsQueries, invalidateTransactionQueries } from '@/lib/api/invalidate-queries';
import { enrichAccountsWithBalances } from '@/lib/accounts/balance';
import { ACCOUNTS_FEATURE_ENABLED } from '@/lib/config/product-features';
import type { BankAccount } from '@/lib/domain/account.types';
import { scheduleFinancialRecalculation } from '@/lib/domain/financial/engine.runner';
import { useAuth } from '@/lib/auth';
import { useGoalContributions } from '@/hooks/queries/useGoalContributions';
import { useLoanPayments } from '@/hooks/queries/useLoanPayments';
import { useTransactions } from '@/hooks/queries/useTransactions';

export function useAccounts() {
  const { isAuthenticated } = useAuth();

  return useQuery<BankAccount[]>({
    queryKey: queryKeys.accounts,
    queryFn: fetchAccountsData,
    enabled: isAuthenticated && ACCOUNTS_FEATURE_ENABLED,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAccountsWithBalances() {
  const accountsQuery = useAccounts();
  const { data: transactions = [] } = useTransactions('all');
  const { data: goalContributions = [] } = useGoalContributions();
  const { data: loanPayments = [] } = useLoanPayments();

  const accounts = accountsQuery.data ?? [];
  const withBalances = enrichAccountsWithBalances(
    accounts,
    transactions,
    goalContributions,
    loanPayments,
  );

  return {
    ...accountsQuery,
    data: withBalances,
    totalBalance: withBalances
      .filter((account) => account.isActive)
      .reduce((sum, account) => sum + (account.balance ?? account.initialBalance), 0),
  };
}

function invalidateAccountDerivedQueries(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
  void queryClient.invalidateQueries({ queryKey: queryKeys.home });
  void queryClient.invalidateQueries({ queryKey: queryKeys.netWorth });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  void queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
  invalidateTransactionQueries(queryClient);
  invalidateAssetsQueries(queryClient);
  if (userId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.financialEngine(userId) });
  }
}

export function useSaveAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (input: Partial<BankAccount> & Pick<BankAccount, 'name' | 'type' | 'initialBalance'>) => {
      if (input.id) {
        return updateAccountData(input as BankAccount);
      }
      return createAccountData({
        name: input.name,
        type: input.type,
        institution: input.institution,
        color: input.color,
        icon: input.icon,
        initialBalance: input.initialBalance,
        isActive: input.isActive ?? true,
        currency: input.currency ?? 'EUR',
        budgetEnabled: input.budgetEnabled,
      });
    },
    onSuccess: (account, variables) => {
      invalidateAccountDerivedQueries(queryClient, userId);
      scheduleFinancialRecalculation(queryClient, userId, {
        type: variables.id ? 'account_updated' : 'account_created',
        accountId: account.id,
      });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: (accountId: string) => deleteAccountData(accountId),
    onSuccess: (_void, accountId) => {
      invalidateAccountDerivedQueries(queryClient, userId);
      scheduleFinancialRecalculation(queryClient, userId, {
        type: 'account_deleted',
        accountId,
      });
    },
  });
}
