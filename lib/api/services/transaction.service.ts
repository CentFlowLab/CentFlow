import { apiFetch } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  createMockTransaction,
  deleteMockTransaction,
  fetchMockTransactions,
  updateMockTransaction,
} from '@/lib/api/mock-transactions';
import {
  mapTransaction,
  mapTransactionsResponse,
  toCreateTransactionPayload,
  toUpdateTransactionPayload,
} from '@/lib/api/mappers/transaction.mapper';
import {
  fetchReceiptItemsMap,
  rollbackCreatedTransaction,
  saveReceiptConfirmation,
} from '@/lib/api/services/receipt-items.service';
import {
  confirmReceiptData,
  processReceiptOcr,
  uploadReceipt,
} from '@/lib/api/services/receipt.service';
import { isMockAuthEnabled } from '@/lib/auth';
import { isSupabaseEnabled, supabaseTransactions } from '@/lib/supabase';
import { traceMovementError, traceMovementStep } from '@/lib/doctor';
import type { ReceiptOcrResult } from '@/lib/domain/receipt.types';
import type {
  CreateTransactionInput,
  CreateTransactionOptions,
  CreateTransactionOutcome,
  Transaction,
  TransactionFilter,
  UpdateTransactionInput,
} from '@/lib/domain/transaction.types';
import type {
  RawTransaction,
  RawTransactionsResponse,
} from '@/lib/types/transaction.api';

async function attachReceiptItems(transactions: Transaction[]): Promise<Transaction[]> {
  const receiptIds = [
    ...new Set(transactions.map((tx) => tx.receiptId).filter(Boolean)),
  ] as string[];

  if (receiptIds.length === 0) return transactions;

  const itemsMap = await fetchReceiptItemsMap(receiptIds);

  return transactions.map((tx) => {
    if (!tx.receiptId) return tx;
    const items = itemsMap.get(tx.receiptId);
    if (!items?.length) return tx;
    return { ...tx, receiptItems: items };
  });
}

export async function fetchTransactions(
  filter: TransactionFilter = 'all',
): Promise<Transaction[]> {
  let transactions: Transaction[];

  if (isMockAuthEnabled()) {
    transactions = await fetchMockTransactions(filter);
  } else if (isSupabaseEnabled()) {
    transactions = await supabaseTransactions.fetchTransactions(filter);
  } else {
    const params = filter === 'all' ? undefined : { type: filter };

    const raw = await apiFetch<RawTransactionsResponse | RawTransaction[]>(
      API_ENDPOINTS.transactions,
      { params },
    );

    transactions = mapTransactionsResponse(raw);

    if (filter !== 'all') {
      transactions = transactions.filter((t) => t.type === filter);
    }
  }

  return attachReceiptItems(transactions);
}

/**
 * Cria movimento.
 *
 * Fluxo com confirmação (recomendado):
 *   processReceiptFlow() → ConfirmReceiptModal → createTransaction({ receiptMeta, confirmation })
 *
 * Fluxo legado (sem confirmação):
 *   createTransaction({ receipt: draft })
 */
export async function createTransaction(
  input: CreateTransactionInput,
  options?: CreateTransactionOptions,
): Promise<CreateTransactionOutcome> {
  traceMovementStep('mutation_service_start', {
    component: 'transaction.service',
    hasReceipt: Boolean(input.receipt || input.receiptMeta),
    hasConfirmation: Boolean(input.confirmation),
  });

  let receiptId: string | undefined = input.receiptMeta?.receiptId;
  let receiptUrl: string | undefined = input.receiptMeta?.receiptUrl;
  let receiptImage: string | undefined = input.receiptMeta?.receiptImage;
  let ocrResult: ReceiptOcrResult | null = null;
  let ocrProcessed = false;

  if (input.receipt && !receiptId) {
    options?.onPhase?.('uploading_receipt');
    traceMovementStep('mutation_service_upload', { component: 'transaction.service' });
    const upload = await uploadReceipt(input.receipt);
    receiptId = upload.id;
    receiptUrl = upload.url;
    receiptImage = upload.localUri ?? upload.url;

    options?.onPhase?.('processing_ocr');
    traceMovementStep('mutation_service_ocr', { component: 'transaction.service', skipOcr: input.skipOcr });
    if (!input.skipOcr) {
      try {
        ocrResult = await processReceiptOcr(upload.id, upload.ocrResult);
        ocrProcessed = ocrResult !== null;
      } catch {
        ocrProcessed = false;
      }
    }
  }

  options?.onPhase?.('creating_transaction');
  traceMovementStep('mutation_service_creating', {
    component: 'transaction.service',
    backend: isMockAuthEnabled() ? 'mock' : isSupabaseEnabled() ? 'supabase' : 'api',
  });

  const transactionInput: CreateTransactionInput = {
    type: input.confirmation?.type ?? input.type,
    amount: input.confirmation?.amount ?? input.amount,
    category: input.confirmation?.category ?? input.category,
    description: input.confirmation?.description ?? input.description,
    date: input.confirmation?.date ?? input.date,
  };

  let transaction: Transaction;

  if (isMockAuthEnabled()) {
    transaction = await createMockTransaction(transactionInput, {
      receiptId,
      receiptUrl,
      receiptImage,
    });
  } else if (isSupabaseEnabled()) {
    traceMovementStep('mutation_service_supabase_insert', { component: 'transaction.service' });
    transaction = await supabaseTransactions.createTransaction({
      ...transactionInput,
      receiptId,
    });

    if (receiptImage && !transaction.receiptImage) {
      transaction.receiptImage = receiptImage;
    }
    if (receiptUrl && !transaction.receiptUrl) {
      transaction.receiptUrl = receiptUrl;
    }
  } else {
    if (input.confirmation && receiptId) {
      await confirmReceiptData(receiptId, input.confirmation);
    }

    const payload = toCreateTransactionPayload({ ...transactionInput, receiptId });

    const raw = await apiFetch<RawTransaction>(API_ENDPOINTS.transactions, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    transaction = mapTransaction(raw);

    if (receiptImage && !transaction.receiptImage) {
      transaction.receiptImage = receiptImage;
    }
    if (receiptId && !transaction.receiptId) {
      transaction.receiptId = receiptId;
    }
    if (receiptUrl && !transaction.receiptUrl) {
      transaction.receiptUrl = receiptUrl;
    }
  }

  let itemsSavedCount = 0;

  if (input.confirmation && receiptId) {
    try {
      itemsSavedCount = await saveReceiptConfirmation(
        receiptId,
        transaction.id,
        input.confirmation,
      );

      if (input.confirmation.items?.length) {
        transaction = {
          ...transaction,
          receiptItems: input.confirmation.items,
        };
      }

      if (__DEV__ && itemsSavedCount > 0) {
        console.log(
          `[CentFlow] receipt_items saved: ${itemsSavedCount} for receipt ${receiptId}`,
        );
      }
    } catch (error) {
      if (isMockAuthEnabled()) {
        await deleteMockTransaction(transaction.id);
      } else {
        await rollbackCreatedTransaction(transaction.id);
      }
      throw error;
    }
  }

  traceMovementStep('mutation_service_done', {
    component: 'transaction.service',
    transactionId: transaction.id,
    itemsSavedCount,
  });

  return {
    transaction,
    ocrResult,
    ocrProcessed,
    itemsSavedCount,
  };
}

export async function updateTransaction(
  transactionId: string,
  input: UpdateTransactionInput,
): Promise<Transaction> {
  if (isMockAuthEnabled()) {
    return updateMockTransaction(transactionId, input);
  }

  if (isSupabaseEnabled()) {
    return supabaseTransactions.updateTransaction(transactionId, input);
  }

  const payload = toUpdateTransactionPayload(input);
  const raw = await apiFetch<RawTransaction>(API_ENDPOINTS.transaction(transactionId), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  return mapTransaction(raw);
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  if (isMockAuthEnabled()) {
    return deleteMockTransaction(transactionId);
  }

  if (isSupabaseEnabled()) {
    return supabaseTransactions.deleteTransaction(transactionId);
  }

  await apiFetch<void>(API_ENDPOINTS.transaction(transactionId), {
    method: 'DELETE',
  });
}
