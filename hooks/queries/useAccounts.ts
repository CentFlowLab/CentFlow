import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAccountData,
  deleteAccountData,
  fetchAccountsData,
  updateAccountData,
} from '@/lib/api/services/accounts.service';
import { queryKeys } from '@/lib/api/keys';
import { enrichAccountsWithBalances } from '@/lib/accounts/balance';
import { ACCOUNTS_FEATURE_ENABLED } from '@/lib/config/product-features';
import type { BankAccount } from '@/lib/domain/account.types';
import { useAuth } from '@/lib/auth';
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

  const accounts = accountsQuery.data ?? [];
  const withBalances = enrichAccountsWithBalances(accounts, transactions);

  return {
    ...accountsQuery,
    data: withBalances,
    totalBalance: withBalances
      .filter((account) => account.isActive)
      .reduce((sum, account) => sum + (account.balance ?? account.initialBalance), 0),
  };
}

export function useSaveAccount() {
  const queryClient = useQueryClient();

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
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.home });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => deleteAccountData(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.home });
    },
  });
}
