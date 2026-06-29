import {
  createMockAccount,
  deleteMockAccount,
  fetchMockAccounts,
  updateMockAccount,
} from '@/lib/api/mock-accounts';
import { isMockAuthEnabled } from '@/lib/auth';
import type {
  BankAccount,
  CreateAccountInput,
  UpdateAccountInput,
} from '@/lib/domain/account.types';
import { isSupabaseEnabled } from '@/lib/supabase';
import * as supabaseAccounts from '@/lib/supabase/accounts';

export async function fetchAccountsData(): Promise<BankAccount[]> {
  if (isMockAuthEnabled()) return fetchMockAccounts();
  if (isSupabaseEnabled()) return supabaseAccounts.fetchAccounts();
  return [];
}

export async function createAccount(input: CreateAccountInput): Promise<BankAccount> {
  if (isMockAuthEnabled()) return createMockAccount(input);
  if (isSupabaseEnabled()) return supabaseAccounts.createAccount(input);
  throw new Error('Backend de contas indisponível');
}

export async function updateAccount(id: string, input: UpdateAccountInput): Promise<BankAccount> {
  if (isMockAuthEnabled()) return updateMockAccount(id, input);
  if (isSupabaseEnabled()) return supabaseAccounts.updateAccount(id, input);
  throw new Error('Backend de contas indisponível');
}

export async function deleteAccount(id: string): Promise<void> {
  if (isMockAuthEnabled()) return deleteMockAccount(id);
  if (isSupabaseEnabled()) return supabaseAccounts.deleteAccount(id);
  throw new Error('Backend de contas indisponível');
}
