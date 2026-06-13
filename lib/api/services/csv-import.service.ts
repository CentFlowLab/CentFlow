import {
  createMockTransactionsBulk,
} from '@/lib/api/mock-transactions';
import { isMockAuthEnabled } from '@/lib/auth';
import { csvRowToCreateInput } from '@/lib/csv/parse-transactions-csv';
import type { CsvImportRow } from '@/lib/csv/csv-import.types';
import { isSupabaseEnabled, supabaseTransactions } from '@/lib/supabase';
import type { Transaction } from '@/lib/domain/transaction.types';

import { createTransaction } from './transaction.service';

export type BulkImportResult = {
  imported: number;
  failed: number;
  transactions: Transaction[];
};

export async function importTransactionsBulk(
  rows: CsvImportRow[],
): Promise<BulkImportResult> {
  const validRows = rows.filter((row) => row.valid);
  const inputs = validRows.map(csvRowToCreateInput);

  if (inputs.length === 0) {
    return { imported: 0, failed: 0, transactions: [] };
  }

  if (isMockAuthEnabled()) {
    const transactions = await createMockTransactionsBulk(inputs);
    return {
      imported: transactions.length,
      failed: 0,
      transactions,
    };
  }

  if (isSupabaseEnabled()) {
    const transactions = await supabaseTransactions.createTransactionsBulk(inputs);
    return {
      imported: transactions.length,
      failed: validRows.length - transactions.length,
      transactions,
    };
  }

  const transactions: Transaction[] = [];
  let failed = 0;

  for (const input of inputs) {
    try {
      const outcome = await createTransaction(input);
      transactions.push(outcome.transaction);
    } catch {
      failed++;
    }
  }

  return {
    imported: transactions.length,
    failed,
    transactions,
  };
}
