import { getCategoryLabel } from '@/lib/data/transaction-categories';
import {
  countsAsBudgetExpense,
  countsAsBudgetIncome,
  resolveTransactionKind,
} from '@/lib/domain/financial/transaction-kind';
import type {
  ReceiptConfirmationInput,
  ReceiptDraft,
  ReceiptOcrItem,
  ReceiptOcrResult,
  ReceiptUpload,
} from '@/lib/domain/receipt.types';
import type {
  CreateTransactionInput,
  Transaction,
  TransactionFilter,
  TransactionType,
  UpdateTransactionInput,
} from '@/lib/domain/transaction.types';
import type { LoginCredentials, RegisterCredentials, User } from '@/lib/auth/types';
import { inputDateToIso } from '@/lib/utils/format';

import type { OcrResultRow, ReceiptRow, TransactionRow } from './database.types';

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Garante YYYY-MM-DD na leitura/gravação — evita ambiguidade DD-MM vs MM-DD. */
function normalizeTransactionDate(raw: string): string {
  const trimmed = raw.trim();
  const fromInput = inputDateToIso(trimmed);
  if (fromInput) return fromInput;
  const isoMatch = trimmed.match(ISO_DATE_RE);
  if (isoMatch) return isoMatch[0];
  return trimmed.slice(0, 10);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function mapProfileToUser(
  profile: { id: string; name: string; currency: string },
  email: string,
): User {
  return {
    id: profile.id,
    name: profile.name || 'Utilizador',
    email,
    currency: profile.currency ?? 'EUR',
    avatarInitials: getInitials(profile.name || email),
  };
}

export function mapTransactionRow(row: TransactionRow): Transaction {
  const type = row.type as TransactionType;
  return {
    id: row.id,
    type,
    amount: Number(row.amount),
    category: row.category,
    categoryLabel: getCategoryLabel(row.category, type),
    description: row.description ?? undefined,
    date: normalizeTransactionDate(row.transaction_date),
    currency: row.currency ?? 'EUR',
    receiptId: row.receipt_id,
    receiptUrl: null,
    receiptImage: null,
    accountId: row.account_id ?? undefined,
    destinationAccountId: row.destination_account_id ?? undefined,
    creditId: (row as TransactionRow & { credit_id?: string | null }).credit_id ?? undefined,
    relatedTransactionId:
      (row as TransactionRow & { related_transaction_id?: string | null }).related_transaction_id ??
      undefined,
    recurringId:
      (row as TransactionRow & { recurring_id?: string | null }).recurring_id ?? undefined,
    budgetMonth: (row as TransactionRow).budget_month ?? undefined,
  };
}

export async function enrichTransactionsWithReceiptUrls(
  rows: TransactionRow[],
  getSignedUrl: (path: string) => Promise<string | null>,
): Promise<Transaction[]> {
  const receiptPaths = new Map<string, string>();

  for (const row of rows) {
    if (row.receipt_id) {
      const path = (row as TransactionRow & { receipt_storage_path?: string }).receipt_storage_path;
      if (path) receiptPaths.set(row.receipt_id, path);
    }
  }

  const urlByReceiptId = new Map<string, string>();
  await Promise.all(
    [...receiptPaths.entries()].map(async ([receiptId, path]) => {
      const url = await getSignedUrl(path);
      if (url) urlByReceiptId.set(receiptId, url);
    }),
  );

  return rows.map((row) => {
    const tx = mapTransactionRow(row);
    if (row.receipt_id) {
      const url = urlByReceiptId.get(row.receipt_id) ?? null;
      tx.receiptUrl = url;
      tx.receiptImage = url;
    }
    return tx;
  });
}

export function mapOcrResultRow(row: OcrResultRow): ReceiptOcrResult {
  const items = Array.isArray(row.items)
    ? (row.items as unknown as ReceiptOcrItem[])
    : undefined;

  return {
    merchantName: row.merchant_name ?? undefined,
    totalAmount: row.total_amount != null ? Number(row.total_amount) : undefined,
    date: row.receipt_date ?? undefined,
    suggestedCategory: row.suggested_category ?? undefined,
    confidence: row.confidence != null ? Number(row.confidence) : undefined,
    rawText: row.raw_text ?? undefined,
    items,
    source: row.source === 'google_vision' ? 'api' : row.source === 'device' ? 'device' : 'demo',
  };
}

function normalizeReceiptStatus(raw?: string): ReceiptUpload['status'] {
  const value = raw?.toLowerCase();
  if (value === 'processing' || value === 'pending') return 'processing';
  if (value === 'ready' || value === 'completed' || value === 'done') return 'ready';
  if (value === 'failed' || value === 'error') return 'failed';
  return 'uploaded';
}

export function mapReceiptRow(
  row: ReceiptRow,
  signedUrl: string | null,
  localUri?: string,
): ReceiptUpload {
  return {
    id: row.id,
    url: signedUrl ?? localUri ?? '',
    localUri: localUri ?? signedUrl ?? undefined,
    status: normalizeReceiptStatus(row.status),
  };
}

export function toTransactionInsert(
  userId: string,
  input: CreateTransactionInput & { receiptId?: string },
) {
  return {
    user_id: userId,
    type: input.type,
    amount: input.amount,
    category: input.category,
    description: input.description?.trim() || null,
    transaction_date: normalizeTransactionDate(input.date),
    currency: 'EUR',
    receipt_id: input.receiptId ?? null,
    account_id: input.accountId ?? null,
    destination_account_id: input.destinationAccountId ?? null,
    credit_id: input.creditId ?? null,
    related_transaction_id: input.relatedTransactionId ?? null,
    recurring_id: input.recurringId ?? null,
  };
}

export function toConfirmationTransactionPatch(input: ReceiptConfirmationInput) {
  return {
    type: input.type,
    amount: input.amount,
    category: input.category,
    description: input.description?.trim() || null,
    transaction_date: normalizeTransactionDate(input.date),
  };
}

export function toTransactionUpdatePatch(input: UpdateTransactionInput) {
  return {
    type: input.type,
    amount: input.amount,
    category: input.category,
    description: input.description?.trim() || null,
    transaction_date: normalizeTransactionDate(input.date),
    account_id: input.accountId ?? null,
    destination_account_id: input.destinationAccountId ?? null,
    credit_id: input.creditId ?? null,
    related_transaction_id: input.relatedTransactionId ?? null,
    recurring_id: input.recurringId ?? null,
  };
}

export function buildReceiptStoragePath(
  userId: string,
  receiptId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${userId}/${receiptId}/${safeName}`;
}

export function filterTransactions(
  transactions: Transaction[],
  filter: TransactionFilter,
): Transaction[] {
  if (filter === 'all') return transactions;
  return transactions.filter((tx) => {
    if (filter === 'expense') return countsAsBudgetExpense(tx);
    if (filter === 'income') return countsAsBudgetIncome(tx);
    if (filter === 'transfer') return resolveTransactionKind(tx) === 'transfer';
    return false;
  });
}

export type AuthCredentials = LoginCredentials | RegisterCredentials;
