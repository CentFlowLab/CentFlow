import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

import type {
  ReceiptDraft,
  ReceiptOcrResult,
  ReceiptUpload,
} from '@/lib/domain/receipt.types';
import type {
  RawReceiptConfirmPayload,
  RawReceiptOcrItem,
  RawReceiptOcrPayload,
  RawReceiptResponse,
} from '@/lib/types/receipt.api';
import { RECEIPT_PREPROCESS_VERSION } from '@/lib/receipt/receipt-image-preprocess';
import type { ReceiptConfirmationInput } from '@/lib/domain/receipt.types';

function pick<T>(...values: (T | undefined | null)[]): T | undefined {
  return values.find((v) => v !== undefined && v !== null) as T | undefined;
}

function unwrap<T extends object>(payload: T | { data?: T }): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    (payload as { data?: T }).data
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function toNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeReceiptStatus(raw?: string): ReceiptUpload['status'] {
  const value = raw?.toLowerCase();
  if (value === 'processing' || value === 'pending') return 'processing';
  if (value === 'ready' || value === 'completed' || value === 'done') return 'ready';
  if (value === 'failed' || value === 'error') return 'failed';
  return 'uploaded';
}

/**
 * Constrói FormData para POST /receipts.
 * Native: uri object (RN). Web: Blob via fetch. Valida existência com expo-file-system.
 */
function appendOcrUploadHints(formData: FormData, draft: ReceiptDraft) {
  // Hints para o backend optimizar OCR (ignorados se não suportados)
  const version = draft.preprocessVersion ?? RECEIPT_PREPROCESS_VERSION;
  formData.append('locale', 'pt-PT');
  formData.append('document_type', 'receipt');
  formData.append('preprocess_version', version);
  formData.append('preprocessVersion', version);
  // v3+: mobile já fez contraste/nitidez — backend pode saltar ou aplicar deskew apenas
  formData.append('enhance_contrast', version >= '3' ? 'client_done' : 'true');
  formData.append('deskew', 'true');
  formData.append('grayscale', version >= '4' ? 'client_done' : 'false');
  if (draft.width) formData.append('image_width', String(draft.width));
  if (draft.height) formData.append('image_height', String(draft.height));
}

async function appendOriginalFile(formData: FormData, draft: ReceiptDraft) {
  const originalUri = draft.originalLocalUri;
  if (!originalUri || originalUri === draft.localUri) return;

  if (Platform.OS === 'web') {
    const response = await fetch(originalUri);
    const blob = await response.blob();
    const baseName = draft.fileName.replace(/-ocr\.jpg$/i, '');
    formData.append('original', blob, `${baseName}-original.jpg`);
    return;
  }

  const info = await FileSystem.getInfoAsync(originalUri);
  if (!info.exists) return;

  const baseName = draft.fileName.replace(/-ocr\.jpg$/i, '');
  formData.append('original', {
    uri: originalUri,
    name: `${baseName}-original.jpg`,
    type: draft.mimeType,
  } as unknown as Blob);
  formData.append('preserve_original', 'true');
}

export async function buildReceiptFormData(draft: ReceiptDraft): Promise<FormData> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(draft.localUri);
    const blob = await response.blob();
    formData.append('file', blob, draft.fileName);
    appendOcrUploadHints(formData, draft);
    await appendOriginalFile(formData, draft);
    return formData;
  }

  const info = await FileSystem.getInfoAsync(draft.localUri);
  if (!info.exists) {
    throw new Error('O ficheiro do talão não foi encontrado. Tenta seleccionar a imagem novamente.');
  }

  formData.append('file', {
    uri: draft.localUri,
    name: draft.fileName,
    type: draft.mimeType,
  } as unknown as Blob);

  appendOcrUploadHints(formData, draft);
  await appendOriginalFile(formData, draft);

  return formData;
}

export function mapReceiptOcrResult(raw?: RawReceiptOcrPayload | null): ReceiptOcrResult | null {
  if (!raw) return null;

  const payload = unwrap(raw);
  const totalAmount = toNumber(
    pick(payload.totalAmount, payload.total_amount, payload.amount),
  );

  const items = (payload.items ?? [])
    .filter((item) => item.name)
    .map(mapReceiptOcrItem);

  const result: ReceiptOcrResult = {
    merchantName: pick(payload.merchantName, payload.merchant_name),
    totalAmount,
    date: pick(payload.date, payload.transactionDate, payload.transaction_date),
    suggestedCategory: pick(
      payload.suggestedCategory,
      payload.suggested_category,
      payload.category,
    ),
    confidence: toNumber(payload.confidence),
    rawText: pick(payload.rawText, payload.raw_text),
    items: items.length > 0 ? items : undefined,
  };

  const hasData = Object.values(result).some((v) => v !== undefined && v !== null);
  return hasData ? result : null;
}

export function extractOcrFromUploadResponse(
  raw: RawReceiptResponse,
): ReceiptOcrResult | null {
  const payload = unwrap(raw);
  return mapReceiptOcrResult(
    pick(payload.ocrResult, payload.ocr_result, payload.ocr),
  );
}

function mapReceiptOcrItem(raw: RawReceiptOcrItem) {
  return {
    name: raw.name ?? 'Item',
    quantity: toNumber(raw.quantity),
    unitPrice: toNumber(pick(raw.unitPrice, raw.unit_price)),
    total: toNumber(raw.total),
  };
}

export function toReceiptConfirmPayload(
  data: ReceiptConfirmationInput,
): RawReceiptConfirmPayload {
  return {
    merchant_name: data.merchantName,
    merchantName: data.merchantName,
    total_amount: data.amount,
    totalAmount: data.amount,
    date: data.date,
    category: data.category,
    description: data.description,
    type: data.type,
  };
}

export function mapReceiptUpload(
  raw: RawReceiptResponse,
  fallback?: ReceiptDraft,
): ReceiptUpload {
  const payload = unwrap(raw);
  const id = pick(payload.receiptId, payload.receipt_id, payload.id);
  const ocrResult = extractOcrFromUploadResponse(raw);

  return {
    id: id !== undefined ? String(id) : `receipt-${Date.now()}`,
    url: pick(payload.url, payload.fileUrl, payload.file_url) ?? fallback?.localUri ?? '',
    localUri: fallback?.originalLocalUri ?? fallback?.localUri,
    status: normalizeReceiptStatus(payload.status),
    ocrResult,
  };
}
