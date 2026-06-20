import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { queryKeys } from '@/lib/api/keys';
import { invalidateTransactionQueries } from '@/lib/api/invalidate-queries';
import {
  applyOptimisticTransactionDelete,
  applyOptimisticTransactionUpdate,
  getTransactionQueries,
  patchTransactionCaches,
} from '@/lib/api/transaction-cache';
import {
  createTransaction,
  deleteTransaction,
  fetchTransactions,
  updateTransaction,
} from '@/lib/api/services/transaction.service';
import { useAuth } from '@/lib/auth';
import { logDoctorMutationFailure, traceMovementError, traceMovementStep } from '@/lib/doctor';
import type {
  CreateTransactionInput,
  CreateTransactionPhase,
  Transaction,
  TransactionFilter,
  UpdateTransactionInput,
} from '@/lib/domain/transaction.types';

export {
  getTransactionQueries,
  patchTransactionCaches,
  invalidateTransactionQueries,
};

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
    mutationFn: async (input: CreateTransactionInput) => {
      traceMovementStep('mutation_start', {
        component: 'useCreateTransaction',
        type: input.type,
        category: input.category,
      });
      try {
        const outcome = await createTransaction(input, {
          onPhase: (phase) => {
            setPhase(phase);
            traceMovementStep('mutation_phase', { phase, component: 'useCreateTransaction' });
          },
        });
        return outcome;
      } catch (error) {
        traceMovementError('mutation_error', error, { component: 'useCreateTransaction' });
        throw error;
      }
    },
    onSettled: (_data, error) => {
      traceMovementStep(error ? 'mutation_error' : 'mutation_settled', {
        component: 'useCreateTransaction',
        hadError: Boolean(error),
      });
      queueMicrotask(() => setPhase(null));
    },
    onSuccess: () => {
      traceMovementStep('mutation_success', { component: 'useCreateTransaction' });
      invalidateTransactionQueries(queryClient);
    },
    onError: (error, variables) => {
      logDoctorMutationFailure(error, {
        action: 'create_transaction',
        screen: 'AddTransactionModal',
        payload: { type: variables.type, category: variables.category },
      });
    },
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
        applyOptimisticTransactionUpdate(transactions, transactionId, input),
      );

      return { snapshot };
    },
    onError: (_error, variables, context) => {
      context?.snapshot.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      logDoctorMutationFailure(_error, {
        action: 'movement_update',
        screen: 'EditTransactionModal',
        payload: { transactionId: variables.transactionId },
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
        applyOptimisticTransactionDelete(transactions, transactionId),
      );

      return { snapshot };
    },
    onError: (_error, transactionId, context) => {
      context?.snapshot.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      logDoctorMutationFailure(_error, {
        action: 'movement_delete',
        screen: 'EditTransactionModal',
        payload: { transactionId },
      });
    },
    onSettled: () => invalidateTransactionQueries(queryClient),
  });
}
