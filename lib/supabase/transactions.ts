import type {
  CreateTransactionInput,
  Transaction,
  TransactionFilter,
  UpdateTransactionInput,
} from '@/lib/domain/transaction.types';

import { traceMovementError, traceMovementStep } from '@/lib/doctor';
import { getSupabaseClient } from './client';
import {
  enrichTransactionsWithReceiptUrls,
  filterTransactions,
  mapTransactionRow,
  toConfirmationTransactionPatch,
  toTransactionInsert,
  toTransactionUpdatePatch,
} from './mappers';

async function getSignedReceiptUrl(storagePath: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function fetchTransactions(
  filter: TransactionFilter = 'all',
): Promise<Transaction[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false });

  if (filter !== 'all') {
    query = query.eq('type', filter);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const receiptIds = [...new Set(rows.map((r) => r.receipt_id).filter(Boolean))] as string[];

  const pathByReceiptId = new Map<string, string>();
  if (receiptIds.length > 0) {
    const { data: receipts } = await supabase
      .from('receipts')
      .select('id, storage_path')
      .in('id', receiptIds);

    for (const receipt of receipts ?? []) {
      pathByReceiptId.set(receipt.id, receipt.storage_path);
    }
  }

  const rowsWithPaths = rows.map((row) => ({
    ...row,
    receipt_storage_path: row.receipt_id
      ? pathByReceiptId.get(row.receipt_id)
      : undefined,
  }));

  const transactions = await enrichTransactionsWithReceiptUrls(rowsWithPaths, getSignedReceiptUrl);
  return filterTransactions(transactions, filter);
}

export async function createTransaction(
  input: CreateTransactionInput & { receiptId?: string },
): Promise<Transaction> {
  traceMovementStep('mutation_service_supabase_auth', { component: 'supabase.transactions' });
  const supabase = getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    traceMovementError('mutation_error', userError ?? new Error('no user'), {
      component: 'supabase.transactions',
      phase: 'auth',
    });
    throw new Error('Utilizador não autenticado');
  }

  const payload = toTransactionInsert(user.id, input);

  traceMovementStep('mutation_service_supabase_insert', {
    component: 'supabase.transactions',
    type: input.type,
    category: input.category,
  });

  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select()
    .single();

  if (error) {
    traceMovementError('mutation_error', error, {
      component: 'supabase.transactions',
      phase: 'insert',
      code: error.code,
    });
    throw new Error(error.message);
  }

  const transaction = mapTransactionRow(data);

  if (input.receiptId) {
    traceMovementStep('mutation_service_supabase_receipt_url', {
      component: 'supabase.transactions',
      receiptId: input.receiptId,
    });
    const { data: receipt } = await supabase
      .from('receipts')
      .select('storage_path')
      .eq('id', input.receiptId)
      .maybeSingle();

    if (receipt?.storage_path) {
      const url = await getSignedReceiptUrl(receipt.storage_path);
      transaction.receiptUrl = url;
      transaction.receiptImage = url;
    }
  }

  return transaction;
}

/** Após confirmação OCR — cria movimento ligado ao talão */
export async function createTransactionFromConfirmation(
  receiptId: string,
  input: CreateTransactionInput & { receiptId?: string },
): Promise<Transaction> {
  return createTransaction({ ...input, receiptId });
}

export async function updateTransactionFromConfirmation(
  transactionId: string,
  confirmation: Parameters<typeof toConfirmationTransactionPatch>[0],
): Promise<void> {
  const supabase = getSupabaseClient();
  const patch = toConfirmationTransactionPatch(confirmation);

  const { error } = await supabase
    .from('transactions')
    .update(patch)
    .eq('id', transactionId);

  if (error) throw new Error(error.message);
}

export async function updateTransaction(
  transactionId: string,
  input: UpdateTransactionInput,
): Promise<Transaction> {
  const supabase = getSupabaseClient();
  const patch = toTransactionUpdatePatch(input);

  const { data, error } = await supabase
    .from('transactions')
    .update(patch)
    .eq('id', transactionId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const transaction = mapTransactionRow(data);

  if (data.receipt_id) {
    const { data: receipt } = await supabase
      .from('receipts')
      .select('storage_path')
      .eq('id', data.receipt_id)
      .maybeSingle();

    if (receipt?.storage_path) {
      const url = await getSignedReceiptUrl(receipt.storage_path);
      transaction.receiptUrl = url;
      transaction.receiptImage = url;
    }
  }

  return transaction;
}

export async function fetchTransactionById(transactionId: string): Promise<Transaction | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapTransactionRow(data);
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
  if (error) throw new Error(error.message);
}

export async function countTransactionsByCategory(category: string): Promise<number> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Utilizador não autenticado');

  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('category', category);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function reassignTransactionsCategory(
  fromCategory: string,
  toCategory: string,
): Promise<number> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Utilizador não autenticado');

  const { data, error } = await supabase
    .from('transactions')
    .update({ category: toCategory })
    .eq('user_id', user.id)
    .eq('category', fromCategory)
    .select('id');

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function renameTransactionsCategory(
  fromCategory: string,
  toCategory: string,
): Promise<number> {
  return reassignTransactionsCategory(fromCategory, toCategory);
}

export async function createTransactionsBulk(
  inputs: CreateTransactionInput[],
): Promise<Transaction[]> {
  if (inputs.length === 0) return [];

  const supabase = getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Utilizador não autenticado');
  }

  const payloads = inputs.map((input) => toTransactionInsert(user.id, input));

  const { data, error } = await supabase
    .from('transactions')
    .insert(payloads)
    .select();

  if (error) throw new Error(error.message);

  return (data ?? []).map(mapTransactionRow);
}
