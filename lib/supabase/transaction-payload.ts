import { ACCOUNTS_FEATURE_ENABLED, MERCHANT_COLUMN_ENABLED } from '@/lib/config/product-features';
import type { Transaction } from '@/lib/domain/transaction.types';

import type { Database } from './database.types';

type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];

const TRANSACTION_INSERT_KEYS = [
  'amount',
  'category',
  'created_at',
  'currency',
  'description',
  'id',
  'merchant',
  'merchant_group_id',
  'receipt_id',
  'transaction_date',
  'type',
  'updated_at',
  'user_id',
] as const satisfies readonly (keyof TransactionInsert)[];

const TRANSACTION_UPDATE_KEYS = [
  'amount',
  'category',
  'created_at',
  'currency',
  'description',
  'id',
  'merchant',
  'merchant_group_id',
  'receipt_id',
  'transaction_date',
  'type',
  'updated_at',
  'user_id',
] as const satisfies readonly (keyof TransactionUpdate)[];

function getInsertKeys(): readonly string[] {
  const keys: string[] = [...TRANSACTION_INSERT_KEYS];
  if (ACCOUNTS_FEATURE_ENABLED) keys.push('account_id');
  return keys;
}

function getUpdateKeys(): readonly string[] {
  const keys: string[] = [...TRANSACTION_UPDATE_KEYS];
  if (ACCOUNTS_FEATURE_ENABLED) keys.push('account_id');
  return keys;
}

function getDisabledTransactionKeys(): Set<string> {
  const disabled = new Set<string>();
  if (!MERCHANT_COLUMN_ENABLED) disabled.add('merchant');
  if (!ACCOUNTS_FEATURE_ENABLED) disabled.add('account_id');
  return disabled;
}

function pickAllowedPayload<T extends Record<string, unknown>>(
  row: Record<string, unknown>,
  allowedKeys: readonly string[],
): T {
  const disabled = getDisabledTransactionKeys();
  const result: Record<string, unknown> = {};

  for (const key of allowedKeys) {
    if (disabled.has(key)) continue;
    if (key in row) {
      result[key] = row[key];
    }
  }

  return result as T;
}

export function pickTransactionInsertPayload(row: Record<string, unknown>): TransactionInsert {
  return pickAllowedPayload<TransactionInsert>(row, getInsertKeys());
}

export function pickTransactionUpdatePayload(row: Record<string, unknown>): TransactionUpdate {
  return pickAllowedPayload<TransactionUpdate>(row, getUpdateKeys());
}

export function withLocalMerchant(
  transaction: Transaction,
  merchant?: string,
): Transaction {
  const trimmed = merchant?.trim();
  if (!trimmed || MERCHANT_COLUMN_ENABLED) return transaction;
  return { ...transaction, merchant: trimmed };
}
