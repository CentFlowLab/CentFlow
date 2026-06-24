import type { ReceiptDraft, ReceiptOcrResult } from '@/lib/domain/receipt.types';
import { getReceiptOcrUri, isPdfReceipt } from '@/lib/receipt/receipt-image-preprocess';
import { parseReceiptFromRawText, safeSanitizeOcrResult } from '@/lib/receipt/ocr-sanitize';

export type ClientOcrOutcome = {
  result: ReceiptOcrResult | null;
  unavailableReason?: 'pdf' | 'module' | 'empty' | 'error';
};

/**
 * OCR on-device (ML Kit / Vision) — funciona sem backend.
 * Usa a imagem já optimizada para OCR no draft.
 */
export async function runClientOcr(draft: ReceiptDraft): Promise<ClientOcrOutcome> {
  if (isPdfReceipt(draft.mimeType, draft.fileName)) {
    return { result: null, unavailableReason: 'pdf' };
  }

  try {
    const { recognizeText } = await import('expo-ocr-kit');
    const ocrImageUri = getReceiptOcrUri(draft);

    const recognized = await recognizeText(ocrImageUri);
    const rawText = recognized.text?.trim() ?? '';

    if (!rawText || rawText.length < 12) {
      return { result: null, unavailableReason: 'empty' };
    }

    const parsed = parseReceiptFromRawText(rawText);
    const result = safeSanitizeOcrResult({
      ...parsed,
      rawText,
      confidence: rawText.length > 100 ? 0.74 : rawText.length > 40 ? 0.68 : 0.52,
      source: 'device',
    });

    return { result };
  } catch (error) {
    if (__DEV__) {
      console.warn('[runClientOcr] failed', error);
    }
    return { result: null, unavailableReason: 'module' };
  }
}

export function getClientOcrUnavailableMessage(reason?: ClientOcrOutcome['unavailableReason']): string {
  switch (reason) {
    case 'pdf':
      return 'Não conseguimos ler este talão (PDF). Preenche manualmente — o ficheiro fica guardado.';
    case 'empty':
      return 'Não conseguimos ler este talão. Tenta outra foto com melhor luz e foco.';
    case 'module':
    default:
      return 'Não conseguimos ler este talão.';
  }
}
