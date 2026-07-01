import type { BankAccount } from '@/lib/domain/account.types';
import { logAppError } from '@/lib/diagnostics/app-log';

import type { TablesInsert } from './database.types';

import { getSupabaseClient } from './client';

type AccountRow = {
  id: string;
  name: string;
  type: BankAccount['type'];
  institution?: string | null;
  bank?: string | null;
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

function resolveInstitution(row: AccountRow): string | undefined {
  return row.institution ?? row.bank ?? undefined;
}

function mapAccountRow(row: AccountRow): BankAccount {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    institution: resolveInstitution(row),
    color: row.color ?? undefined,
    icon: row.icon ?? undefined,
    initialBalance: Number(row.initial_balance),
    isActive: row.is_active,
    currency: row.currency ?? 'EUR',
  };
}

function buildAccountPayload(
  input: Omit<BankAccount, 'id' | 'balance'>,
  userId: string,
): TablesInsert<'accounts'> {
  const institution = input.institution ?? null;
  return {
    user_id: userId,
    name: input.name,
    type: input.type,
    institution,
    bank: institution,
    color: input.color ?? null,
    icon: input.icon ?? null,
    initial_balance: input.initialBalance,
    is_active: input.isActive,
    currency: input.currency ?? 'EUR',
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

function logAccountError(operation: string, error: unknown): void {
  logAppError('accounts', error instanceof Error ? error.message : String(error), {
    operation,
  });
}

export async function fetchAccounts(): Promise<BankAccount[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logAccountError('fetch', error);
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapAccountRow(row as AccountRow));
}

export async function createAccount(
  input: Omit<BankAccount, 'id' | 'balance'>,
): Promise<BankAccount> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();
  const payload = buildAccountPayload(input, userId);

  let { data, error } = await supabase.from('accounts').insert(payload).select('*').single();

  if (error?.message?.includes('institution')) {
    const { institution, ...legacyPayload } = payload;
    const bankOnly: TablesInsert<'accounts'> = {
      ...legacyPayload,
      bank: institution,
    };
    ({ data, error } = await supabase.from('accounts').insert(bankOnly).select('*').single());
  }

  if (error) {
    logAccountError('create', error);
    throw new Error(error.message);
  }
  return mapAccountRow(data as AccountRow);
}

export async function updateAccount(account: BankAccount): Promise<BankAccount> {
  const supabase = getSupabaseClient();
  if (!isUuid(account.id)) throw new Error('ID de conta inválido');

  const institution = account.institution ?? null;
  const { data, error } = await supabase
    .from('accounts')
    .update({
      name: account.name,
      type: account.type,
      institution,
      bank: institution,
      color: account.color ?? null,
      icon: account.icon ?? null,
      initial_balance: account.initialBalance,
      is_active: account.isActive,
      currency: account.currency ?? 'EUR',
    })
    .eq('id', account.id)
    .select('*')
    .single();

  if (error) {
    logAccountError('update', error);
    throw new Error(error.message);
  }
  return mapAccountRow(data as AccountRow);
}

export async function deleteAccountFromSupabase(accountId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('accounts').delete().eq('id', accountId);
  if (error) {
    logAccountError('delete', error);
    throw new Error(error.message);
  }
}
