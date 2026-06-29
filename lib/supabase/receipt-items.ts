import type { ReceiptConfirmationInput, ReceiptConfirmedItem } from '@/lib/domain/receipt.types';

import { getSupabaseClient } from './client';
import {
  mapReceiptItemRow,
  toReceiptConfirmMetadataPatch,
  toReceiptItemInserts,
  type ReceiptItemRow,
} from './receipt-item-mappers';

export async function saveReceiptItems(
  receiptId: string,
  transactionId: string,
  items: ReceiptConfirmedItem[],
): Promise<number> {
  if (items.length === 0) {
    await deleteReceiptItemsForReceipt(receiptId);
    return 0;
  }

  const supabase = getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Utilizador não autenticado');
  }

  const { error: deleteError } = await supabase
    .from('receipt_items')
    .delete()
    .eq('receipt_id', receiptId);

  if (deleteError) {
    throw new Error(`Falha ao limpar itens anteriores: ${deleteError.message}`);
  }

  const rows = toReceiptItemInserts(user.id, receiptId, transactionId, items);

  const { error: insertError } = await supabase.from('receipt_items').insert(rows);

  if (insertError) {
    throw new Error(`Falha ao guardar itens do talão: ${insertError.message}`);
  }

  return items.length;
}

export async function deleteReceiptItemsForReceipt(receiptId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('receipt_items').delete().eq('receipt_id', receiptId);
  if (error) throw new Error(error.message);
}

export async function fetchReceiptItemsByReceiptId(
  receiptId: string,
): Promise<ReceiptConfirmedItem[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('receipt_items')
    .select('*')
    .eq('receipt_id', receiptId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as ReceiptItemRow[] | null)?.map(mapReceiptItemRow) ?? [];
}

export async function fetchReceiptItemsByReceiptIds(
  receiptIds: string[],
): Promise<Map<string, ReceiptConfirmedItem[]>> {
  const result = new Map<string, ReceiptConfirmedItem[]>();
  if (receiptIds.length === 0) return result;

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('receipt_items')
    .select('*')
    .in('receipt_id', receiptIds)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);

  for (const row of (data as ReceiptItemRow[] | null) ?? []) {
    const items = result.get(row.receipt_id) ?? [];
    items.push(mapReceiptItemRow(row));
    result.set(row.receipt_id, items);
  }

  return result;
}

export async function finalizeReceiptConfirmation(
  receiptId: string,
  transactionId: string,
  confirmation: ReceiptConfirmationInput,
): Promise<number> {
  const supabase = getSupabaseClient();
  const items = confirmation.items ?? [];

  const itemsSaved = await saveReceiptItems(receiptId, transactionId, items);

  const { error: receiptError } = await supabase
    .from('receipts')
    .update({ status: 'ready' })
    .eq('id', receiptId);

  if (receiptError) {
    throw new Error(`Falha ao atualizar estado do talão: ${receiptError.message}`);
  }

  const metadataPatch = toReceiptConfirmMetadataPatch(confirmation);

  const { error: ocrError } = await supabase
    .from('ocr_results')
    .update(metadataPatch)
    .eq('receipt_id', receiptId);

  if (ocrError && ocrError.code !== 'PGRST116') {
    // Sem OCR prévio — não bloqueia confirmação
    if (__DEV__) console.warn('[finalizeReceiptConfirmation] ocr update skipped', ocrError);
  }

  return itemsSaved;
}

export async function rollbackTransaction(transactionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('transactions').delete().eq('id', transactionId);
}
