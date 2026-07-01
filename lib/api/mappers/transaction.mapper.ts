import { getCategoryLabel } from '@/lib/data/transaction-categories';
import type {
  CreateTransactionInput,
  Transaction,
  TransactionType,
  UpdateTransactionInput,
} from '@/lib/domain/transaction.types';
import type {
  RawCreateTransactionPayload,
  RawTransaction,
  RawTransactionsResponse,
} from '@/lib/types/transaction.api';

function pick<T>(...values: (T | undefined | null)[]): T | undefined {
  return values.find((v) => v !== undefined && v !== null) as T | undefined;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toId(value: string | number | undefined): string {
  return value !== undefined ? String(value) : '';
}

function normalizeType(raw?: string): TransactionType {
  const value = raw?.toLowerCase();
  if (value === 'transfer') return 'transfer';
  if (value === 'credit_payment') return 'credit_payment';
  if (value === 'income' || value === 'receita' || value === 'credit') {
    return 'income';
  }
  return 'expense';
}

function unwrapTransactions(raw: RawTransactionsResponse | RawTransaction[]): RawTransaction[] {
  if (Array.isArray(raw)) return raw;

  if (Array.isArray(raw.transactions)) return raw.transactions;

  const data = raw.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray(data.transactions)) {
    return data.transactions;
  }

  return [];
}

export function mapTransaction(raw: RawTransaction): Transaction {
  const type = normalizeType(
    pick(raw.type, raw.transaction_type, raw.transactionType),
  );
  const category = pick(raw.category, raw.category_id, raw.categoryId) ?? 'other';
  const categoryLabel =
    pick(raw.categoryLabel, raw.category_label) ?? getCategoryLabel(category, type);

  return {
    id: toId(raw.id) || `${type}-${category}-${pick(raw.date, raw.transaction_date, raw.transactionDate, raw.created_at, raw.createdAt)}`,
    type,
    amount: Math.abs(toNumber(raw.amount)),
    category,
    categoryLabel,
    description: pick(raw.description, raw.notes),
    date:
      pick(raw.date, raw.transaction_date, raw.transactionDate, raw.created_at, raw.createdAt) ??
      new Date().toISOString(),
    currency: raw.currency ?? 'EUR',
    receiptId: pick(raw.receiptId, raw.receipt_id)?.toString() ?? null,
    receiptUrl: pick(raw.receiptUrl, raw.receipt_url) ?? null,
    receiptImage:
      pick(raw.receiptImage, raw.receipt_image, raw.receiptUrl, raw.receipt_url) ?? null,
    accountId: pick(raw.accountId, raw.account_id)?.toString() ?? null,
    destinationAccountId: pick(raw.destinationAccountId, raw.destination_account_id)?.toString() ?? null,
    creditId: pick(raw.creditId, raw.credit_id)?.toString() ?? null,
  };
}

export function mapTransactionsResponse(
  raw: RawTransactionsResponse | RawTransaction[],
): Transaction[] {
  return unwrapTransactions(raw)
    .map(mapTransaction)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function toCreateTransactionPayload(
  input: CreateTransactionInput & { receiptId?: string },
): RawCreateTransactionPayload {
  return {
    type: input.type,
    amount: input.amount,
    category: input.category,
    description: input.description?.trim() || undefined,
    date: input.date,
    receipt_id: input.receiptId,
    receiptId: input.receiptId,
  };
}

export function toUpdateTransactionPayload(
  input: UpdateTransactionInput,
): RawCreateTransactionPayload {
  return {
    type: input.type,
    amount: input.amount,
    category: input.category,
    description: input.description?.trim() || undefined,
    date: input.date,
  };
}