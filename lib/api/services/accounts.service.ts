import { ACCOUNTS_FEATURE_ENABLED } from '@/lib/config/product-features';
import type { BankAccount } from '@/lib/domain/account.types';
import { isSupabaseEnabled, supabaseAccounts } from '@/lib/supabase';

export async function fetchAccountsData(): Promise<BankAccount[]> {
  if (!ACCOUNTS_FEATURE_ENABLED) return [];
  if (!isSupabaseEnabled()) return [];
  return supabaseAccounts.fetchAccounts();
}

export async function createAccountData(
  input: Omit<BankAccount, 'id' | 'balance'>,
): Promise<BankAccount> {
  if (!ACCOUNTS_FEATURE_ENABLED || !isSupabaseEnabled()) {
    throw new Error('Backend de contas indisponível');
  }
  return supabaseAccounts.createAccount(input);
}

export async function updateAccountData(account: BankAccount): Promise<BankAccount> {
  if (!ACCOUNTS_FEATURE_ENABLED || !isSupabaseEnabled()) {
    throw new Error('Backend de contas indisponível');
  }
  return supabaseAccounts.updateAccount(account);
}

export async function deleteAccountData(accountId: string): Promise<void> {
  if (!ACCOUNTS_FEATURE_ENABLED || !isSupabaseEnabled()) {
    throw new Error('Backend de contas indisponível');
  }
  return supabaseAccounts.deleteAccountFromSupabase(accountId);
}
