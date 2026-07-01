import type { CashTransactionType, Transaction } from './transaction.types';
import { formatInputDate } from '@/lib/utils/format';

export type TransactionFormValues = {
  type: CashTransactionType;
  amount: string;
  category: string;
  description: string;
  date: string;
  accountId?: string;
};

export function parseTransactionAmount(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

export function isTransactionEditable(transaction: Transaction): boolean {
  return transaction.type !== 'transfer' && transaction.type !== 'credit_payment';
}

export function transactionToFormValues(transaction: Transaction): TransactionFormValues {
  if (!isTransactionEditable(transaction)) {
    throw new Error('Transferências não podem ser editadas como movimentos.');
  }
  return {
    type: transaction.type as CashTransactionType,
    amount: String(transaction.amount),
    category: transaction.category,
    description: transaction.description ?? '',
    date: formatInputDate(transaction.date),
    accountId: transaction.accountId ?? undefined,
  };
}

export function formValuesToUpdateInput(values: TransactionFormValues) {
  return {
    type: values.type,
    amount: parseTransactionAmount(values.amount),
    category: values.category,
    description: values.description.trim() || undefined,
    date: values.date,
    accountId: values.accountId || null,
  };
}
