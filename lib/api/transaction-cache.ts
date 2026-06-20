import type { QueryClient } from '@tanstack/react-query';

import { getCategoryLabel } from '@/lib/data/transaction-categories';
import type { Transaction, UpdateTransactionInput } from '@/lib/domain/transaction.types';

export type TransactionSnapshot = Array<[readonly unknown[], Transaction[] | undefined]>;

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

export function applyOptimisticTransactionUpdate(
  transactions: Transaction[],
  transactionId: string,
  input: UpdateTransactionInput,
): Transaction[] {
  return transactions.map((transaction) =>
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
  );
}

export function applyOptimisticTransactionDelete(
  transactions: Transaction[],
  transactionId: string,
): Transaction[] {
  return transactions.filter((transaction) => transaction.id !== transactionId);
}
