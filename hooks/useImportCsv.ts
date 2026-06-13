import { useMutation, useQueryClient } from '@tanstack/react-query';

import { importTransactionsBulk } from '@/lib/api/services/csv-import.service';
import {
  getTransactionQueries,
  invalidateTransactionQueries,
  patchTransactionCaches,
} from '@/hooks/queries/useTransactions';
import type { CsvImportRow } from '@/lib/csv/csv-import.types';
import { csvRowToCreateInput } from '@/lib/csv/parse-transactions-csv';
import { getCategoryLabel } from '@/lib/data/transaction-categories';
import type { Transaction } from '@/lib/domain/transaction.types';

function buildOptimisticTransactions(rows: CsvImportRow[]): Transaction[] {
  return rows
    .filter((row) => row.valid)
    .map((row, index) => {
      const input = csvRowToCreateInput(row);
      return {
        id: `optimistic-import-${Date.now()}-${index}`,
        type: input.type,
        amount: input.amount,
        category: input.category,
        categoryLabel: getCategoryLabel(input.category, input.type),
        description: input.description,
        date: input.date,
        currency: 'EUR',
        receiptId: null,
        receiptUrl: null,
        receiptImage: null,
      };
    });
}

export function useImportCsv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rows: CsvImportRow[]) => importTransactionsBulk(rows),
    onMutate: async (rows) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const snapshot = getTransactionQueries(queryClient);
      const optimistic = buildOptimisticTransactions(rows);

      patchTransactionCaches(queryClient, (transactions) => [
        ...optimistic,
        ...transactions,
      ]);

      return { snapshot };
    },
    onError: (_error, _rows, context) => {
      context?.snapshot.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      invalidateTransactionQueries(queryClient);
    },
  });
}
