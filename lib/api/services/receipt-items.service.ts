import {
  confirmMockReceiptData,
  fetchMockReceiptItemsByReceiptId,
  fetchMockReceiptItemsByReceiptIds,
} from '@/lib/api/mock-receipt-items';
import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import type { ReceiptConfirmationInput, ReceiptConfirmedItem } from '@/lib/domain/receipt.types';
import { isSupabaseEnabled } from '@/lib/supabase';
import * as supabaseReceiptItems from '@/lib/supabase/receipt-items';

export async function saveReceiptConfirmation(
  receiptId: string,
  transactionId: string,
  confirmation: ReceiptConfirmationInput,
): Promise<number> {
  if (isMockAuthEnabled()) {
    return confirmMockReceiptData(receiptId, transactionId, confirmation);
  }

  if (isSupabaseEnabled()) {
    return supabaseReceiptItems.finalizeReceiptConfirmation(
      receiptId,
      transactionId,
      confirmation,
    );
  }

  // API REST: itens enviados via PATCH /receipts/:id/confirm em transaction.service
  return confirmation.items?.length ?? 0;
}

export async function fetchReceiptItemsForReceipt(
  receiptId: string,
): Promise<ReceiptConfirmedItem[]> {
  if (isMockAuthEnabled()) {
    return fetchMockReceiptItemsByReceiptId(receiptId);
  }

  if (isSupabaseEnabled()) {
    return supabaseReceiptItems.fetchReceiptItemsByReceiptId(receiptId);
  }

  return [];
}

export async function fetchReceiptItemsMap(
  receiptIds: string[],
): Promise<Map<string, ReceiptConfirmedItem[]>> {
  if (receiptIds.length === 0) return new Map();

  if (isMockAuthEnabled()) {
    return fetchMockReceiptItemsByReceiptIds(receiptIds);
  }

  if (isSupabaseEnabled()) {
    return supabaseReceiptItems.fetchReceiptItemsByReceiptIds(receiptIds);
  }

  return new Map();
}

export async function rollbackCreatedTransaction(transactionId: string): Promise<void> {
  if (isSupabaseEnabled()) {
    await supabaseReceiptItems.rollbackTransaction(transactionId);
  }
}
