import { apiFetch } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  createMockTransaction,
  fetchMockTransactions,
} from '@/lib/api/mock-transactions';
import {
  mapTransaction,
  mapTransactionsResponse,
  toCreateTransactionPayload,
} from '@/lib/api/mappers/transaction.mapper';
import {
  confirmReceiptData,
  processReceiptOcr,
  uploadReceipt,
} from '@/lib/api/services/receipt.service';
import { isMockAuthEnabled } from '@/lib/auth';
import type {
  CreateTransactionInput,
  CreateTransactionOptions,
  CreateTransactionOutcome,
  Transaction,
  TransactionFilter,
} from '@/lib/domain/transaction.types';
import type { ReceiptOcrResult } from '@/lib/domain/receipt.types';
import type {
  RawTransaction,
  RawTransactionsResponse,
} from '@/lib/types/transaction.api';

export async function fetchTransactions(
  filter: TransactionFilter = 'all',
): Promise<Transaction[]> {
  if (isMockAuthEnabled()) {
    return fetchMockTransactions(filter);
  }

  const params = filter === 'all' ? undefined : { type: filter };

  const raw = await apiFetch<RawTransactionsResponse | RawTransaction[]>(
    API_ENDPOINTS.transactions,
    { params },
  );

  const transactions = mapTransactionsResponse(raw);

  if (filter === 'all') return transactions;
  return transactions.filter((t) => t.type === filter);
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
  let receiptId: string | undefined = input.receiptMeta?.receiptId;
  let receiptUrl: string | undefined = input.receiptMeta?.receiptUrl;
  let receiptImage: string | undefined = input.receiptMeta?.receiptImage;
  let ocrResult: ReceiptOcrResult | null = null;
  let ocrProcessed = false;

  if (input.receipt && !receiptId) {
    options?.onPhase?.('uploading_receipt');
    const upload = await uploadReceipt(input.receipt);
    receiptId = upload.id;
    receiptUrl = upload.url;
    receiptImage = upload.localUri ?? upload.url;

    options?.onPhase?.('processing_ocr');
    try {
      ocrResult = await processReceiptOcr(upload.id, upload.ocrResult);
      ocrProcessed = ocrResult !== null;
    } catch {
      ocrProcessed = false;
    }
  }

  options?.onPhase?.('creating_transaction');

  if (input.confirmation && receiptId) {
    await confirmReceiptData(receiptId, input.confirmation);
  }

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
  } else {
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

  return {
    transaction,
    ocrResult,
    ocrProcessed,
  };
}
