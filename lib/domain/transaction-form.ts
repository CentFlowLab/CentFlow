import type { Transaction, TransactionType } from './transaction.types';

export type TransactionFormValues = {
  type: TransactionType;
  amount: string;
  category: string;
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
    description: transaction.description ?? '',
    date: transaction.date,
  };
}

export function formValuesToUpdateInput(values: TransactionFormValues) {
  return {
    type: values.type,
    amount: parseTransactionAmount(values.amount),
    category: values.category,
    description: values.description.trim() || undefined,
    date: values.date,
  };
}
