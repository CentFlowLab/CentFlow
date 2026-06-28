import { getCategoryLabel } from '@/lib/data/transaction-categories';
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

import type { OcrResultRow, ReceiptRow, TransactionRow } from './database.types';

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
    date: row.transaction_date,
    currency: row.currency ?? 'EUR',
    receiptId: row.receipt_id,
    receiptUrl: null,
    receiptImage: null,
    merchantGroupId: row.merchant_group_id ?? null,
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
    transaction_date: input.date,
    currency: 'EUR',
    receipt_id: input.receiptId ?? null,
  };
}

export function toConfirmationTransactionPatch(input: ReceiptConfirmationInput) {
  return {
    type: input.type,
    amount: input.amount,
    category: input.category,
    description: input.description?.trim() || null,
    transaction_date: input.date,
  };
}

export function toTransactionUpdatePatch(input: UpdateTransactionInput) {
  return {
    type: input.type,
    amount: input.amount,
    category: input.category,
    description: input.description?.trim() || null,
    transaction_date: input.date,
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
  return transactions.filter((t) => t.type === filter);
}

export type AuthCredentials = LoginCredentials | RegisterCredentials;
