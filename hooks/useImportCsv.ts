import { useMutation, useQueryClient } from '@tanstack/react-query';

import { importTransactionsBulk } from '@/lib/api/services/csv-import.service';
import { invalidateTransactionQueries } from '@/hooks/queries/useTransactions';
import type { CsvImportRow } from '@/lib/csv/csv-import.types';

export function useImportCsv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rows: CsvImportRow[]) => importTransactionsBulk(rows),
    onSuccess: () => {
      invalidateTransactionQueries(queryClient);
    },
  });
}
