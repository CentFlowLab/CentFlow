import type { Transaction, TransactionType } from './transaction.types';
import { formatInputDate } from '@/lib/utils/format';

export type TransactionFormValues = {
  type: TransactionType;
  amount: string;
  category: string;
  merchant: string;
  description: string;
  date: string;
};

export function parseTransactionAmount(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

export function transactionToFormValues(transaction: Transaction): TransactionFormValues {
  return {
    type: transaction.type,
    amount: String(transaction.amount),
    category: transaction.category,
    merchant: transaction.merchant ?? '',
    description: transaction.description ?? '',
    date: formatInputDate(transaction.date),
  };
}

export function formValuesToUpdateInput(values: TransactionFormValues) {
  return {
    type: values.type,
    amount: parseTransactionAmount(values.amount),
    category: values.category,
    merchant: values.merchant.trim() || undefined,
    description: values.description.trim() || undefined,
    date: values.date,
  };
}
