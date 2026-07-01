import type { BankAccount, AccountType } from '@/lib/domain/account.types';

import type { TablesInsert } from './database.types';

import { getSupabaseClient } from './client';

type AccountRow = {
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  color: string | null;
  icon: string | null;
  initial_balance: number;
  is_active: boolean;
  currency: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function mapAccountRow(row: AccountRow): BankAccount {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    institution: row.institution ?? undefined,
    color: row.color ?? undefined,
    icon: row.icon ?? undefined,
    initialBalance: Number(row.initial_balance),
    isActive: row.is_active,
    currency: row.currency ?? 'EUR',
  };
}

async function getUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Utilizador não autenticado');
  return user.id;
}

export async function fetchAccounts(): Promise<BankAccount[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapAccountRow(row as AccountRow));
}

export async function createAccount(
  input: Omit<BankAccount, 'id' | 'balance'>,
): Promise<BankAccount> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();

  const payload: TablesInsert<'accounts'> = {
    user_id: userId,
    name: input.name,
    type: input.type,
    institution: input.institution ?? null,
    color: input.color ?? null,
    icon: input.icon ?? null,
    initial_balance: input.initialBalance,
    is_active: input.isActive,
    currency: input.currency ?? 'EUR',
  };

  const { data, error } = await supabase.from('accounts').insert(payload).select('*').single();

  if (error) throw new Error(error.message);
  return mapAccountRow(data as AccountRow);
}

export async function updateAccount(account: BankAccount): Promise<BankAccount> {
  const supabase = getSupabaseClient();
  if (!isUuid(account.id)) throw new Error('ID de conta inválido');

  const { data, error } = await supabase
    .from('accounts')
    .update({
      name: account.name,
      type: account.type,
      institution: account.institution ?? null,
      color: account.color ?? null,
      icon: account.icon ?? null,
      initial_balance: account.initialBalance,
      is_active: account.isActive,
      currency: account.currency ?? 'EUR',
    })
    .eq('id', account.id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapAccountRow(data as AccountRow);
}

export async function deleteAccountFromSupabase(accountId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('accounts').delete().eq('id', accountId);
  if (error) throw new Error(error.message);
}
