import { resolveTransactionKind } from './financial/transaction-kind';
import {
  fieldsToPaymentSelection,
  paymentSelectionToFields,
  resolveExpenseTransactionType,
  type PaymentMethodSelection,
} from './payment-method';
import type { CashTransactionType, Transaction, TransactionType } from './transaction.types';
import { formatInputDate } from '@/lib/utils/format';

export type TransactionFormValues = {
  type: CashTransactionType;
  amount: string;
  category: string;
  description: string;
  date: string;
  accountId?: string;
  paymentMethod?: PaymentMethodSelection;
};

export function parseTransactionAmount(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

export function isTransactionEditable(transaction: Transaction): boolean {
  const kind = resolveTransactionKind(transaction);
  return (
    kind !== 'transfer' &&
    kind !== 'credit_card_payment' &&
    kind !== 'credit_card_refund'
  );
}

function toFormCashType(transaction: Transaction): CashTransactionType {
  const kind = resolveTransactionKind(transaction);
  return kind === 'credit_card_purchase' || kind === 'expense' ? 'expense' : 'income';
}

export function transactionToFormValues(transaction: Transaction): TransactionFormValues {
  if (!isTransactionEditable(transaction)) {
    throw new Error('Transferências não podem ser editadas como movimentos.');
  }

  const cashType = toFormCashType(transaction);

  return {
    type: cashType,
    amount: String(transaction.amount),
    category: transaction.category,
    description: transaction.description ?? '',
    date: formatInputDate(transaction.date),
    accountId: transaction.accountId ?? undefined,
    paymentMethod:
      cashType === 'expense'
        ? fieldsToPaymentSelection(transaction.accountId, transaction.creditId)
        : undefined,
  };
}

export function formValuesToUpdateInput(values: TransactionFormValues) {
  if (values.type === 'expense') {
    const { accountId, creditId } = paymentSelectionToFields(values.paymentMethod);
    const type: TransactionType = resolveExpenseTransactionType(values.paymentMethod);
    return {
      type,
      amount: parseTransactionAmount(values.amount),
      category: values.category,
      description: values.description.trim() || undefined,
      date: values.date,
      accountId,
      creditId,
    };
  }

  return {
    type: values.type,
    amount: parseTransactionAmount(values.amount),
    category: values.category,
    description: values.description.trim() || undefined,
    date: values.date,
    accountId: values.accountId || null,
    creditId: null,
  };
}
