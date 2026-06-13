export { isSupabaseEnabled, getSupabaseUrl, getSupabaseAnonKey } from './config';
export { getSupabaseClient, resetSupabaseClient } from './client';
export * as supabaseAuth from './auth';
export * as supabaseTransactions from './transactions';
export * as supabaseReceipts from './receipts';
export type {
  Database,
  Profile,
  ReceiptRow,
  OcrResultRow,
  TransactionRow,
  ReceiptStatus,
  TransactionType,
  OcrSource,
} from './database.types';
