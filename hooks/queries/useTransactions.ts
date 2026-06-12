import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { queryKeys } from '@/lib/api/keys';
import {
  createTransaction,
  fetchTransactions,
} from '@/lib/api/services/transaction.service';
import { useAuth } from '@/lib/auth';
import type {
  CreateTransactionInput,
  CreateTransactionPhase,
  Transaction,
  TransactionFilter,
} from '@/lib/domain/transaction.types';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
    },
  });

  return {
    ...mutation,
    phase,
    phaseLabel: getCreateTransactionPhaseLabel(phase),
    data: mutation.data?.transaction,
  };
}
