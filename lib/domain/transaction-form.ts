import type { CashTransactionType, Transaction } from './transaction.types';
import { budgetMonthFromDateString } from './budget-month';
import { formatInputDate } from '@/lib/utils/format';

export type TransactionFormValues = {
  type: CashTransactionType;
  amount: string;
  category: string;
  description: string;
  date: string;
  accountId?: string;
  /** YYYY-MM — apenas receitas; vazio = mês da data */
  budgetMonth?: string;
};

export function parseTransactionAmount(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

export function defaultBudgetMonthForDate(date: string): string {
  return budgetMonthFromDateString(date);
}

export function transactionToFormValues(transaction: Transaction): TransactionFormValues {
  return {
    type: transaction.type === 'transfer' ? 'expense' : transaction.type,
    amount: String(transaction.amount),
    category: transaction.category,
    description: transaction.description ?? '',
    date: formatInputDate(transaction.date),
    accountId: transaction.accountId ?? undefined,
    budgetMonth:
      transaction.type === 'income'
        ? transaction.budgetMonth ?? defaultBudgetMonthForDate(transaction.date)
        : undefined,
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
    budgetMonth:
      values.type === 'income'
        ? values.budgetMonth ?? defaultBudgetMonthForDate(values.date)
        : null,
  };
}
