import type { ReceiptOcrItem, ReceiptOcrResult } from '@/lib/domain/receipt.types';
import { toIsoDateString } from '@/lib/utils/format';

import {
  inferCategoryFromMerchant,
  parseReceiptFromRawText,
} from './parse-receipt-pt';

export { parseReceiptFromRawText, isValidPtNif } from './parse-receipt-pt';

function isPlausibleAmount(amount?: number, max = 50000): boolean {
  return amount !== undefined && amount > 0 && amount <= max;
}

function pickAmount(api?: number, parsed?: number, confidence?: number): number | undefined {
  if (isPlausibleAmount(api) && isPlausibleAmount(parsed)) {
    const diff = Math.abs(api! - parsed!) / Math.max(api!, parsed!, 1);
    if (diff < 0.02) return api;
    if ((confidence ?? 0) < 0.65 && parsed !== undefined) return parsed;
    return api;
  }
  return isPlausibleAmount(api) ? api : parsed;
}

const NOISE_LINE =
  /^(total|subtotal|iva|taxa|desconto|troco|cart[aã]o|multibanco|nif|contribuinte|tel|telefone|obrigado)/i;

const ADDRESS_LINE =
  /^(rua|av\.?|avenida|largo|pra[cç]a|praceta|travessa|estrada|alameda|urbaniza[cç][aã]o)\b/i;

function filterItems(
  items: ReceiptOcrItem[] | undefined,
  totalAmount?: number,
): ReceiptOcrItem[] | undefined {
  if (!items?.length) return undefined;

  const filtered = items.filter((item) => {
    if (!item.name || item.name.length < 3) return false;
    if (NOISE_LINE.test(item.name) || ADDRESS_LINE.test(item.name)) return false;
    const total = item.total ?? item.unitPrice;
    if (total === undefined || !isPlausibleAmount(total, 2000)) return false;
    if (totalAmount !== undefined && total > totalAmount * 1.2) return false;
    return true;
  });

  if (filtered.length === 0) return undefined;

  if (totalAmount) {
    const sum = filtered.reduce((s, i) => s + (i.total ?? 0), 0);
    if (sum > totalAmount * 1.35) return undefined;
  }

  return filtered.slice(0, 12);
}

function pickString(
  api?: string,
  parsed?: string,
  confidence?: number,
): string | undefined {
  const a = api?.trim();
  const p = parsed?.trim();
  if (a && p && a.toLowerCase() === p.toLowerCase()) return a;
  if ((confidence ?? 0) < 0.6 && p) return p;
  return a || p;
}

/**
 * Sanitiza e enriquece resultado OCR antes de mostrar no ecrã de confirmação.
 * Aplica heurísticas PT (NIF, ATCUD, IVA, totais) sobre o rawText.
 */
export function sanitizeOcrResult(raw: ReceiptOcrResult | null): ReceiptOcrResult | null {
  if (!raw) return null;

  const parsed = raw.rawText ? parseReceiptFromRawText(raw.rawText) : null;
  const parsedPartial = parsed
    ? {
        merchantName: parsed.merchantName,
        totalAmount: parsed.totalAmount,
        date: parsed.date,
        items: parsed.items,
        rawText: parsed.rawText,
      }
    : {};

  const totalAmount = pickAmount(
    raw.totalAmount,
    parsedPartial.totalAmount,
    raw.confidence ?? parsed?.confidence,
  );
  const merchantName = pickString(
    raw.merchantName,
    parsedPartial.merchantName,
    raw.confidence ?? parsed?.confidence,
  );
  const date =
    pickString(raw.date, parsedPartial.date, raw.confidence ?? parsed?.confidence) ??
    toIsoDateString();

  const mergedItems = filterItems(
    raw.items?.length ? raw.items : parsedPartial.items,
    totalAmount,
  );

  const confidence = Math.max(
    raw.confidence ?? 0,
    parsed?.confidence ?? 0,
    totalAmount && merchantName ? 0.55 : 0,
  );

  const result: ReceiptOcrResult = {
    merchantName,
    totalAmount,
    date,
    suggestedCategory:
      raw.suggestedCategory ?? inferCategoryFromMerchant(merchantName),
    confidence: Math.min(confidence, 1),
    rawText: raw.rawText ?? parsedPartial.rawText,
    items: mergedItems,
    source: raw.source,
  };

  const hasSignal =
    Boolean(result.merchantName) ||
    isPlausibleAmount(result.totalAmount) ||
    Boolean(result.rawText && result.rawText.length > 20);

  return hasSignal ? result : null;
}

/** Sanitização segura — nunca propaga excepções do parser. */
export function safeSanitizeOcrResult(raw: ReceiptOcrResult | null): ReceiptOcrResult | null {
  try {
    return sanitizeOcrResult(raw);
  } catch {
    return null;
  }
}

/** Score de qualidade — usado para decidir fallback on-device */
export function ocrQualityScore(result: ReceiptOcrResult | null): number {
  if (!result) return 0;

  let score = result.confidence ?? 0;
  if (result.totalAmount !== undefined && result.totalAmount > 0) score += 0.25;
  if (result.merchantName && result.merchantName.length >= 3) score += 0.2;
  if (result.date) score += 0.1;
  if (result.rawText && result.rawText.length > 40) score += 0.1;
  if (result.items?.length) score += 0.1;

  return Math.min(score, 1);
}

export function isAcceptableOcrResult(result: ReceiptOcrResult | null): boolean {
  return ocrQualityScore(result) >= 0.55;
}
