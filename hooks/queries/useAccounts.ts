import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAccount,
  deleteAccount,
  fetchAccountsData,
  updateAccount,
} from '@/lib/api/services/accounts.service';
import { enrichAccountsWithBalances } from '@/lib/accounts/balance';
import { ACCOUNTS_FEATURE_ENABLED } from '@/lib/config/product-features';
import type { CreateAccountInput, UpdateAccountInput } from '@/lib/domain/account.types';

import { queryKeys } from '@/lib/api/keys';

export const accountQueryKeys = {
  all: ['accounts'] as const,
};

export function useAccounts() {
  return useQuery({
    queryKey: accountQueryKeys.all,
    queryFn: fetchAccountsData,
    enabled: ACCOUNTS_FEATURE_ENABLED,
  });
}

export function useAccountsWithBalances(transactions: Array<{ accountId?: string | null; type: string; amount: number; date: string }>) {
  const { data: accounts = [], ...rest } = useAccounts();

  if (!ACCOUNTS_FEATURE_ENABLED) {
    return {
      accounts: [] as ReturnType<typeof enrichAccountsWithBalances>,
      totalBalance: 0,
      ...rest,
    };
  }

  const enriched = enrichAccountsWithBalances(accounts, transactions as never);

  return {
    accounts: enriched,
    totalBalance: enriched.reduce((sum, a) => sum + a.balance, 0),
    ...rest,
  };
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAccountInput) => createAccount(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accountQueryKeys.all });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAccountInput }) =>
      updateAccount(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accountQueryKeys.all });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accountQueryKeys.all });
    },
  });
}
