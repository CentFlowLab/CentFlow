import type {
  BankAccount,
  CreateAccountInput,
  UpdateAccountInput,
} from '@/lib/domain/account.types';

import { getSupabaseClient } from './client';

type AccountRow = {
  id: string;
  name: string;
  type: string;
  bank: string | null;
  color: string | null;
  icon: string | null;
  initial_balance: number;
  is_active: boolean;
  currency: string;
  created_at: string;
};

function accountsTable() {
  return getSupabaseClient().from('accounts' as 'transactions');
}

function mapRow(row: AccountRow): BankAccount {
  return {
    id: row.id,
    name: row.name,
    type: row.type as BankAccount['type'],
    bank: row.bank ?? undefined,
    color: row.color ?? undefined,
    icon: row.icon ?? undefined,
    initialBalance: Number(row.initial_balance),
    isActive: row.is_active,
    currency: row.currency ?? 'EUR',
    createdAt: row.created_at,
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
  const { data, error } = await accountsTable()
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as AccountRow[])
    .filter((row) => row.is_active)
    .map(mapRow);
}

export async function createAccount(input: CreateAccountInput): Promise<BankAccount> {
  const userId = await getUserId();

  const { data, error } = await accountsTable()
    .insert({
      user_id: userId,
      name: input.name.trim(),
      type: input.type,
      bank: input.bank?.trim() || null,
      color: input.color ?? null,
      icon: input.icon ?? '🏦',
      initial_balance: input.initialBalance ?? 0,
    } as never)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Falha ao criar conta');
  return mapRow(data as unknown as AccountRow);
}

export async function updateAccount(id: string, input: UpdateAccountInput): Promise<BankAccount> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.type !== undefined) patch.type = input.type;
  if (input.bank !== undefined) patch.bank = input.bank.trim() || null;
  if (input.color !== undefined) patch.color = input.color;
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.initialBalance !== undefined) patch.initial_balance = input.initialBalance;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const { data, error } = await accountsTable()
    .update(patch as never)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Falha ao atualizar conta');
  return mapRow(data as unknown as AccountRow);
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await accountsTable().update({ is_active: false } as never).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateEntityReceiptUrl(
  table: 'transactions' | 'warranties' | 'inventory_items',
  id: string,
  receiptUrl: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from(table).update({ receipt_url: receiptUrl } as never).eq('id', id);
  if (error) throw new Error(error.message);
}
