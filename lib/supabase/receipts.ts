import type {
  ReceiptConfirmationInput,
  ReceiptDraft,
  ReceiptOcrResult,
  ReceiptUpload,
} from '@/lib/domain/receipt.types';

import { getSupabaseClient } from './client';
import {
  buildReceiptStoragePath,
  mapOcrResultRow,
  mapReceiptRow,
} from './mappers';
import { readDraftFileBytes } from '@/lib/receipt/receipt-upload';

const RECEIPTS_BUCKET = 'receipts';
const OCR_FUNCTION = 'process-receipt';

async function getSignedReceiptUrl(storagePath: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function uploadReceipt(draft: ReceiptDraft): Promise<ReceiptUpload> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Utilizador não autenticado');
  }

  const { data: receiptRow, error: insertError } = await supabase
    .from('receipts')
    .insert({
      user_id: user.id,
      storage_path: 'pending',
      mime_type: draft.mimeType,
      file_name: draft.fileName,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError || !receiptRow) {
    throw new Error(insertError?.message ?? 'Falha ao criar registo do talão');
  }

  const storagePath = buildReceiptStoragePath(
    user.id,
    receiptRow.id,
    draft.fileName,
  );

  const fileBytes = await readDraftFileBytes(draft);

  const { error: uploadError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(storagePath, fileBytes, {
      contentType: draft.mimeType,
      upsert: false,
    });

  if (uploadError) {
    await supabase.from('receipts').delete().eq('id', receiptRow.id);
    throw new Error(uploadError.message);
  }

  const { data: updatedReceipt, error: updateError } = await supabase
    .from('receipts')
    .update({ storage_path: storagePath, status: 'uploaded' })
    .eq('id', receiptRow.id)
    .select()
    .single();

  if (updateError || !updatedReceipt) {
    throw new Error(updateError?.message ?? 'Falha ao actualizar talão');
  }

  const signedUrl = await getSignedReceiptUrl(storagePath);
  const localUri = draft.originalLocalUri ?? draft.localUri;

  return mapReceiptRow(updatedReceipt, signedUrl, localUri);
}

/**
 * Extrai o corpo real de um erro da Edge Function (status + JSON), em vez do
 * genérico "Edge Function returned a non-2xx status code". Permite ao Doctor
 * mostrar a causa raiz (ex.: 503 GOOGLE_VISION_API_KEY not configured).
 */
async function describeFunctionError(error: {
  message: string;
  context?: unknown;
}): Promise<string> {
  const context = error.context;
  if (context instanceof Response) {
    const status = context.status;
    try {
      const body = await context.clone().json();
      const detail =
        typeof body?.error === 'string'
          ? typeof body?.hint === 'string'
            ? `${body.error} — ${body.hint}`
            : body.error
          : JSON.stringify(body);
      return `process-receipt ${status}: ${detail}`;
    } catch {
      try {
        const text = await context.clone().text();
        if (text) return `process-receipt ${status}: ${text}`;
      } catch {
        // ignora — cai no fallback abaixo
      }
      return `process-receipt ${status}: ${error.message}`;
    }
  }
  return error.message;
}

export async function invokeVisionOcr(receiptId: string): Promise<ReceiptOcrResult | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke(OCR_FUNCTION, {
    body: { receiptId },
  });

  if (error) {
    throw new Error(await describeFunctionError(error));
  }

  if (data?.error) {
    throw new Error(
      typeof data.hint === 'string' ? `${data.error} — ${data.hint}` : data.error,
    );
  }

  const ocrRow = data?.ocrResult;
  if (!ocrRow) return null;

  return mapOcrResultRow(ocrRow);
}

/** @deprecated Use invokeVisionOcr — mantido para compatibilidade */
export async function invokeProcessReceiptOcr(receiptId: string): Promise<ReceiptOcrResult | null> {
  return invokeVisionOcr(receiptId);
}

export async function fetchOcrResult(receiptId: string): Promise<ReceiptOcrResult | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('ocr_results')
    .select('*')
    .eq('receipt_id', receiptId)
    .maybeSingle();

  if (error || !data) return null;
  return mapOcrResultRow(data);
}

export async function processReceiptOcr(
  receiptId: string,
  inlineResult?: ReceiptOcrResult | null,
): Promise<ReceiptOcrResult | null> {
  if (inlineResult) return inlineResult;

  const existing = await fetchOcrResult(receiptId);
  if (existing) return existing;

  return invokeVisionOcr(receiptId);
}

/** Confirmação reflecte-se no INSERT de transactions — ver createTransaction */
export async function confirmReceiptData(
  _receiptId: string,
  _confirmation: ReceiptConfirmationInput,
): Promise<void> {
  return;
}

export async function getReceiptSignedUrl(receiptId: string): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('receipts')
    .select('storage_path')
    .eq('id', receiptId)
    .maybeSingle();

  if (error || !data?.storage_path) return null;
  return getSignedReceiptUrl(data.storage_path);
}
