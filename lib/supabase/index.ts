export { isSupabaseEnabled, isGoogleSignInAvailable, getSupabaseUrl, getSupabaseAnonKey } from './config';
export {
  getSupabaseClient,
  getSupabaseInitError,
  resetSupabaseClient,
  tryGetSupabaseClient,
} from './client';
export * as supabaseAuth from './auth';
export * as supabaseTransactions from './transactions';
export * as supabaseReceipts from './receipts';
export * as supabaseAssets from './assets';
export * as supabaseLiabilities from './liabilities';
export * as supabaseAccounts from './accounts';
export * as supabaseGoalContributions from './goal-contributions';
export * as supabaseLoanPayments from './loan-payments';
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
