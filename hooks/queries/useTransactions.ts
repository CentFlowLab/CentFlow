import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { queryKeys } from '@/lib/api/keys';
import {
  createTransaction,
  deleteTransaction,
  fetchTransactions,
  updateTransaction,
} from '@/lib/api/services/transaction.service';
import { useAuth } from '@/lib/auth';
import { getCategoryLabel } from '@/lib/data/transaction-categories';
import type {
  CreateTransactionInput,
  CreateTransactionPhase,
  Transaction,
  TransactionFilter,
  UpdateTransactionInput,
} from '@/lib/domain/transaction.types';

type TransactionSnapshot = Array<[readonly unknown[], Transaction[] | undefined]>;

export function getTransactionQueries(queryClient: QueryClient): TransactionSnapshot {
  return queryClient.getQueriesData<Transaction[]>({ queryKey: ['transactions'] });
}

export function patchTransactionCaches(
  queryClient: QueryClient,
  updater: (transactions: Transaction[]) => Transaction[],
) {
  queryClient.setQueriesData<Transaction[]>({ queryKey: ['transactions'] }, (current) =>
    updater(current ?? []),
  );
}

export function invalidateTransactionQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
  queryClient.invalidateQueries({ queryKey: queryKeys.home });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
  queryClient.invalidateQueries({ queryKey: queryKeys.financialProfile });
  queryClient.invalidateQueries({ queryKey: queryKeys.netWorth });
}

export function useTransactions(filter: TransactionFilter = 'all') {
  const { isAuthenticated } = useAuth();

  return useQuery<Transaction[]>({
    queryKey: queryKeys.transactions({ filter }),
    queryFn: () => fetchTransactions(filter),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });
}

const PHASE_LABELS: Record<CreateTransactionPhase, string> = {
  uploading_receipt: 'A enviar talão...',
  processing_ocr: 'A processar OCR...',
  creating_transaction: 'A guardar movimento...',
};

export function getCreateTransactionPhaseLabel(
  phase: CreateTransactionPhase | null,
): string | null {
  if (!phase) return null;
  return PHASE_LABELS[phase];
}

/**
 * Cria movimento com fluxo de talão:
 * upload real (POST /receipts) → OCR → POST /transactions
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<CreateTransactionPhase | null>(null);

  const mutation = useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      createTransaction(input, { onPhase: setPhase }),
    onSettled: () => setPhase(null),
    onSuccess: () => invalidateTransactionQueries(queryClient),
  });

  return {
    ...mutation,
    phase,
    phaseLabel: getCreateTransactionPhaseLabel(phase),
    data: mutation.data?.transaction,
  };
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      transactionId,
      input,
    }: {
      transactionId: string;
      input: UpdateTransactionInput;
    }) => updateTransaction(transactionId, input),
    onMutate: async ({ transactionId, input }) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const snapshot = getTransactionQueries(queryClient);

      patchTransactionCaches(queryClient, (transactions) =>
        transactions.map((transaction) =>
          transaction.id === transactionId
            ? {
                ...transaction,
                type: input.type,
                amount: input.amount,
                category: input.category,
                categoryLabel: getCategoryLabel(input.category, input.type),
                description: input.description,
                date: input.date,
              }
            : transaction,
        ),
      );

      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      context?.snapshot.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => invalidateTransactionQueries(queryClient),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => deleteTransaction(transactionId),
    onMutate: async (transactionId) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const snapshot = getTransactionQueries(queryClient);

      patchTransactionCaches(queryClient, (transactions) =>
        transactions.filter((transaction) => transaction.id !== transactionId),
      );

      return { snapshot };
    },
    onError: (_error, _transactionId, context) => {
      context?.snapshot.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => invalidateTransactionQueries(queryClient),
  });
}
