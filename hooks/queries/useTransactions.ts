import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { queryKeys } from '@/lib/api/keys';
import { invalidateAssetsQueries, invalidateTransactionQueries } from '@/lib/api/invalidate-queries';
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
import { logDoctorMutationFailure, traceMovementError, traceMovementStep, traceTransferError, traceTransferStep } from '@/lib/doctor';
import type {
  CreateTransactionInput,
  CreateTransactionPhase,
  Transaction,
  TransactionFilter,
  UpdateTransactionInput,
} from '@/lib/domain/transaction.types';
import { checkCategorySpendAnomalyForTransaction } from '@/lib/notifications/category-spend-alert.service';
import { scheduleFinancialRecalculation } from '@/lib/domain/financial/engine.runner';

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
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [phase, setPhase] = useState<CreateTransactionPhase | null>(null);

  const mutation = useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const traceStep = (step: string, meta?: Record<string, unknown>) => {
        if (input.type === 'transfer') {
          traceTransferStep(step, { component: 'useCreateTransaction', ...meta });
        } else {
          traceMovementStep(step, { component: 'useCreateTransaction', ...meta });
        }
      };
      const traceError = (step: string, error: unknown, meta?: Record<string, unknown>) => {
        if (input.type === 'transfer') {
          traceTransferError(step, error, { component: 'useCreateTransaction', ...meta });
        } else {
          traceMovementError(step, error, { component: 'useCreateTransaction', ...meta });
        }
      };

      traceStep('mutation_start', { type: input.type, category: input.category });
      try {
        const outcome = await createTransaction(input, {
          onPhase: (phase) => {
            setPhase(phase);
            traceStep('mutation_phase', { phase });
          },
        });
        return outcome;
      } catch (error) {
        traceError('mutation_error', error);
        throw error;
      }
    },
    onSettled: (_data, error, variables) => {
      const traceStep = (step: string, meta?: Record<string, unknown>) => {
        if (variables?.type === 'transfer') {
          traceTransferStep(step, { component: 'useCreateTransaction', ...meta });
        } else {
          traceMovementStep(step, { component: 'useCreateTransaction', ...meta });
        }
      };
      traceStep(error ? 'mutation_error' : 'mutation_settled', { hadError: Boolean(error) });
      queueMicrotask(() => setPhase(null));
    },
    onSuccess: (data, variables) => {
      if (variables.type === 'transfer') {
        traceTransferStep('mutation_success', { component: 'useCreateTransaction' });
      } else {
        traceMovementStep('mutation_success', { component: 'useCreateTransaction' });
      }
      invalidateTransactionQueries(queryClient);
      if (
        variables.creditId ||
        variables.type === 'credit_payment' ||
        variables.type === 'credit_card_payment' ||
        variables.type === 'credit_card_purchase' ||
        variables.type === 'credit_card_refund'
      ) {
        invalidateAssetsQueries(queryClient);
        void queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      }

      const created = data?.transaction;
      if (created) {
        void checkCategorySpendAnomalyForTransaction(created);
      }

      scheduleFinancialRecalculation(queryClient, userId, {
        type: 'transaction_created',
        transactionId: created?.id,
      });
    },
    onError: (error, variables) => {
      logDoctorMutationFailure(error, {
        action: variables.type === 'transfer' ? 'account_transfer' : 'create_transaction',
        screen: variables.type === 'transfer' ? 'TransferAccountModal' : 'AddTransactionModal',
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
  const { user } = useAuth();
  const userId = user?.id ?? '';

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
    onSettled: (_data, _error, variables) => {
      invalidateTransactionQueries(queryClient);
      scheduleFinancialRecalculation(queryClient, userId, {
        type: 'transaction_updated',
        transactionId: variables.transactionId,
      });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

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
    onSettled: (_data, _error, transactionId) => {
      invalidateTransactionQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      scheduleFinancialRecalculation(queryClient, userId, {
        type: 'transaction_deleted',
        transactionId,
      });
    },
  });
}
