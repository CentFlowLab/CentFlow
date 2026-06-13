import { apiFetch, ApiError } from '@/lib/api/client';
import { getReceiptUploadErrorMessage, ReceiptUploadError } from '@/lib/api/errors';
import { API_ENDPOINTS, receiptEndpoints } from '@/lib/api/endpoints';
import {
  buildReceiptFormData,
  mapReceiptOcrResult,
  mapReceiptUpload,
  toReceiptConfirmPayload,
} from '@/lib/api/mappers/receipt.mapper';
import { apiUpload } from '@/lib/api/upload';
import type {
  ProcessedReceipt,
  ReceiptConfirmationInput,
  ReceiptDraft,
  ReceiptOcrResult,
  ReceiptUpload,
} from '@/lib/domain/receipt.types';
import { isMockAuthEnabled, isMockOcrDemoEnabled } from '@/lib/auth';
import { getClientOcrUnavailableMessage, runClientOcr } from '@/lib/receipt/client-ocr';
import { sanitizeOcrResult } from '@/lib/receipt/ocr-sanitize';
import { RECEIPT_PREPROCESS_VERSION } from '@/lib/receipt/receipt-image-preprocess';
import type { RawReceiptOcrPayload, RawReceiptResponse } from '@/lib/types/receipt.api';
import { toIsoDateString } from '@/lib/utils/format';

let mockReceiptCounter = 1;

type OcrRequestBody = {
  locale: string;
  document_type: string;
  documentType: string;
  psm: number;
  oem?: number;
  engine: string;
  preprocess_version: string;
  preprocessVersion: string;
  enhance_contrast?: boolean;
  deskew?: boolean;
};

const OCR_POLL_ATTEMPTS = 8;
const OCR_POLL_DELAY_MS = 1200;

/** Ordem: motores cloud primeiro, Tesseract como fallback */
const OCR_ENGINE_ATTEMPTS: OcrRequestBody[] = [
  {
    locale: 'pt-PT',
    document_type: 'receipt',
    documentType: 'receipt',
    psm: 6,
    oem: 3,
    engine: 'google_vision',
    preprocess_version: RECEIPT_PREPROCESS_VERSION,
    preprocessVersion: RECEIPT_PREPROCESS_VERSION,
    enhance_contrast: true,
    deskew: true,
  },
  {
    locale: 'pt-PT',
    document_type: 'receipt',
    documentType: 'receipt',
    psm: 6,
    oem: 3,
    engine: 'vision',
    preprocess_version: RECEIPT_PREPROCESS_VERSION,
    preprocessVersion: RECEIPT_PREPROCESS_VERSION,
    enhance_contrast: true,
    deskew: true,
  },
  {
    locale: 'pt-PT',
    document_type: 'receipt',
    documentType: 'receipt',
    psm: 6,
    oem: 3,
    engine: 'auto',
    preprocess_version: RECEIPT_PREPROCESS_VERSION,
    preprocessVersion: RECEIPT_PREPROCESS_VERSION,
    enhance_contrast: true,
    deskew: true,
  },
  {
    locale: 'pt-PT',
    document_type: 'receipt',
    documentType: 'receipt',
    psm: 4,
    oem: 3,
    engine: 'tesseract',
    preprocess_version: RECEIPT_PREPROCESS_VERSION,
    preprocessVersion: RECEIPT_PREPROCESS_VERSION,
    enhance_contrast: true,
    deskew: true,
  },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMockReceiptUpload(draft: ReceiptDraft): ReceiptUpload {
  return {
    id: `mock-receipt-${mockReceiptCounter++}`,
    url: draft.originalLocalUri ?? draft.localUri,
    localUri: draft.originalLocalUri ?? draft.localUri,
    status: 'uploaded',
  };
}

function createMockOcrResult(): ReceiptOcrResult {
  const raw: ReceiptOcrResult = {
    merchantName: 'Continente',
    totalAmount: 42.5,
    date: toIsoDateString(),
    suggestedCategory: 'food',
    confidence: 0.78,
    rawText: [
      'CONTINENTE',
      'Rua das Flores 12',
      `Data: ${new Date().toLocaleDateString('pt-PT')}`,
      'Leite meio gordo        1,19',
      'Pão de forma            1,49',
      'Frango inteiro          6,89',
      'TOTAL EUR              42,50',
    ].join('\n'),
    items: [
      { name: 'Leite meio gordo', total: 1.19 },
      { name: 'Pão de forma', total: 1.49 },
      { name: 'Frango inteiro', total: 6.89 },
    ],
  };
  return sanitizeOcrResult({ ...raw, source: 'demo' }) ?? { ...raw, source: 'demo' };
}

function isOcrStillProcessing(payload?: RawReceiptOcrPayload | null): boolean {
  if (!payload) return false;
  const status = payload.status?.toLowerCase();
  return status === 'processing' || status === 'pending' || status === 'queued';
}

function ocrQualityScore(result: ReceiptOcrResult | null): number {
  if (!result) return 0;

  let score = result.confidence ?? 0;
  if (result.totalAmount !== undefined && result.totalAmount > 0) score += 0.25;
  if (result.merchantName && result.merchantName.length >= 3) score += 0.2;
  if (result.date) score += 0.1;
  if (result.rawText && result.rawText.length > 40) score += 0.1;
  if (result.items?.length) score += 0.1;

  return Math.min(score, 1);
}

function isAcceptableOcrResult(result: ReceiptOcrResult | null): boolean {
  return ocrQualityScore(result) >= 0.55;
}

async function pollOcrResult(receiptId: string): Promise<ReceiptOcrResult | null> {
  for (let attempt = 0; attempt < OCR_POLL_ATTEMPTS; attempt++) {
    if (attempt > 0) await delay(OCR_POLL_DELAY_MS);

    try {
      const result = await apiFetch<RawReceiptOcrPayload>(
        receiptEndpoints.ocrResult(receiptId),
      );

      if (isOcrStillProcessing(result)) continue;

      const mapped = mapReceiptOcrResult(result);
      if (mapped) return sanitizeOcrResult(mapped);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      if (attempt === OCR_POLL_ATTEMPTS - 1) return null;
    }
  }

  return null;
}

async function triggerOcrAttempt(
  receiptId: string,
  body: OcrRequestBody,
): Promise<ReceiptOcrResult | null> {
  try {
    const triggered = await apiFetch<RawReceiptOcrPayload>(
      receiptEndpoints.ocr(receiptId),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );

    if (isOcrStillProcessing(triggered)) {
      const polled = await pollOcrResult(receiptId);
      if (polled) return polled;
    }

    const mapped = mapReceiptOcrResult(triggered);
    if (mapped) return sanitizeOcrResult(mapped);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
      return null;
    }
  }

  return await pollOcrResult(receiptId);
}

export type ProcessReceiptPhase = 'uploading_receipt' | 'processing_ocr';

export async function processReceiptFlow(
  draft: ReceiptDraft,
  options?: { onPhase?: (phase: ProcessReceiptPhase) => void },
): Promise<ProcessedReceipt> {
  options?.onPhase?.('uploading_receipt');
  const upload = await uploadReceipt(draft);

  options?.onPhase?.('processing_ocr');

  let ocrResult: ReceiptOcrResult | null = null;
  let ocrUnavailableReason: string | undefined;

  if (isMockOcrDemoEnabled()) {
    await delay(700);
    ocrResult = createMockOcrResult();
  } else if (isMockAuthEnabled()) {
    const client = await runClientOcr(draft);
    ocrResult = client.result;
    if (!ocrResult) {
      ocrUnavailableReason = getClientOcrUnavailableMessage(client.unavailableReason);
    }
  } else {
    try {
      ocrResult = await processReceiptOcr(upload.id, upload.ocrResult);
    } catch {
      ocrResult = null;
    }

    if (!ocrResult) {
      const client = await runClientOcr(draft);
      ocrResult = client.result;
      if (!ocrResult) {
        ocrUnavailableReason = getClientOcrUnavailableMessage(client.unavailableReason);
      }
    }
  }

  return {
    receiptId: upload.id,
    receiptUrl: upload.url,
    receiptImage: upload.localUri ?? draft.originalLocalUri ?? draft.localUri,
    ocrResult,
    ocrUnavailableReason,
    draft,
  };
}

/** Upload sem OCR — para preenchimento manual com talão anexado. */
export async function uploadReceiptOnly(draft: ReceiptDraft): Promise<ProcessedReceipt> {
  const upload = await uploadReceipt(draft);

  return {
    receiptId: upload.id,
    receiptUrl: upload.url,
    receiptImage: upload.localUri ?? draft.originalLocalUri ?? draft.localUri,
    ocrResult: null,
    draft,
  };
}

export async function confirmReceiptData(
  receiptId: string,
  data: ReceiptConfirmationInput,
): Promise<void> {
  if (isMockAuthEnabled()) {
    await delay(200);
    return;
  }

  try {
    await apiFetch(receiptEndpoints.confirm(receiptId), {
      method: 'PATCH',
      body: JSON.stringify(toReceiptConfirmPayload(data)),
    });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 501)) {
      return;
    }
    throw error;
  }
}

export async function uploadReceipt(draft: ReceiptDraft): Promise<ReceiptUpload> {
  if (isMockAuthEnabled()) {
    await delay(500);
    return createMockReceiptUpload(draft);
  }

  try {
    const formData = await buildReceiptFormData(draft);
    const raw = await apiUpload<RawReceiptResponse>(API_ENDPOINTS.receipts, formData);
    const upload = mapReceiptUpload(raw, draft);

    if (!upload.id) {
      throw new ReceiptUploadError('O servidor não devolveu um identificador de talão.');
    }

    if (upload.ocrResult) {
      upload.ocrResult = sanitizeOcrResult(upload.ocrResult);
    }

    return upload;
  } catch (error) {
    if (error instanceof ReceiptUploadError) throw error;
    throw new ReceiptUploadError(getReceiptUploadErrorMessage(error), error);
  }
}

/**
 * OCR com fallback multi-motor, hints PT e sanitização client-side.
 * Tenta motores cloud primeiro; se confiança baixa, tenta Tesseract psm 4.
 */
export async function processReceiptOcr(
  receiptId: string,
  inlineResult?: ReceiptOcrResult | null,
): Promise<ReceiptOcrResult | null> {
  if (inlineResult) {
    return sanitizeOcrResult(inlineResult);
  }

  if (isMockOcrDemoEnabled()) {
    await delay(700);
    return createMockOcrResult();
  }

  if (isMockAuthEnabled()) {
    return null;
  }

  let best: ReceiptOcrResult | null = null;
  let bestScore = 0;

  for (const body of OCR_ENGINE_ATTEMPTS) {
    const result = await triggerOcrAttempt(receiptId, body);
    if (!result) continue;

    const score = ocrQualityScore(result);
    if (score > bestScore) {
      best = result;
      bestScore = score;
    }

    if (isAcceptableOcrResult(result)) {
      return result;
    }
  }

  return best;
}
