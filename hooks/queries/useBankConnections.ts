import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { fetchTransactions } from '@/lib/api/services/transaction.service';
import { scheduleFinancialRecalculation } from '@/lib/domain/financial/engine.runner';
import {
  createBankLink,
  fetchBankConnections,
  fetchSupportedBanks,
  finalizeBankLink,
  revokeBankConnection,
  syncBankConnection,
} from '@/lib/open-banking/gocardless.service';
import { useAuth } from '@/lib/auth';
import {
  checkCategorySpendAnomaliesForTransactions,
  filterExpenseTransactions,
  findNewTransactions,
} from '@/lib/notifications/category-spend-alert.service';
import type { Transaction } from '@/lib/domain/transaction.types';

export function useSupportedBanks() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.openBankingInstitutions,
    queryFn: fetchSupportedBanks,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 60,
  });
}

export function useBankConnections() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.bankConnections,
    queryFn: fetchBankConnections,
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });
}

export function useCreateBankLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (institutionId: string) => createBankLink(institutionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bankConnections });
    },
  });
}

export function useFinalizeBankLink() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (requisitionId: string) => {
      const previous = await fetchTransactions('all');
      const result = await finalizeBankLink(requisitionId);
      return { result, previous };
    },
    onSuccess: async ({ result, previous }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bankConnections });
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions() });

      if (result.sync?.imported && result.sync.imported > 0) {
        scheduleFinancialRecalculation(queryClient, userId, {
          type: 'open_banking_import',
          importedCount: result.sync.imported,
        });
        await runCategorySpendChecksAfterImport(previous);
      }
    },
  });
}

export function useRevokeBankConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => revokeBankConnection(connectionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bankConnections });
    },
  });
}

export function useSyncBankConnection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const previous = await fetchTransactions('all');
      const result = await syncBankConnection(connectionId);
      return { result, previous };
    },
    onSuccess: async ({ result, previous }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bankConnections });
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.transactions() });
        if (result.imported && result.imported > 0) {
          scheduleFinancialRecalculation(queryClient, userId, {
            type: 'open_banking_import',
            importedCount: result.imported,
          });
          await runCategorySpendChecksAfterImport(previous);
        }
      }
    },
  });
}

async function runCategorySpendChecksAfterImport(previous: Transaction[]): Promise<void> {
  try {
    const current = await fetchTransactions('all');
    const imported = filterExpenseTransactions(findNewTransactions(previous, current));
    if (imported.length === 0) return;
    await checkCategorySpendAnomaliesForTransactions(imported);
  } catch {
    // Efeito secundário — não bloquear sync.
  }
}
