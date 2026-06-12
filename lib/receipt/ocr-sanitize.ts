import type { ReceiptOcrItem, ReceiptOcrResult } from '@/lib/domain/receipt.types';
import { toIsoDateString } from '@/lib/utils/format';

/**
 * Pós-processamento client-side dos resultados OCR.
 *
 * Motivo: motores OCR (especialmente Tesseract genérico) devolvem:
 *  - itens fantasma, preços deslocados, datas erradas
 *  - campos estruturados inconsistentes com rawText
 *
 * Estratégia:
 *  1. Re-parsear rawText com heurísticas PT (TOTAL, datas DD/MM/YYYY)
 *  2. Fundir campos API + parse — preferir o mais plausível
 *  3. Filtrar linhas de itens inválidas
 */

const TOTAL_PATTERNS = [
  /(?:TOTAL\s*(?:EUR|€)?|VALOR\s*TOTAL|IMPORTE\s*TOTAL|TOTAL\s*A\s*PAGAR)\s*[:\s]*€?\s*(\d{1,6}[.,]\d{2})/i,
  /(?:^|\n)\s*TOTAL\s*[:\s]*(\d{1,6}[.,]\d{2})/im,
  /€\s*(\d{1,6}[.,]\d{2})\s*$/im,
];

const DATE_PATTERNS = [
  /(\d{2})[./-](\d{2})[./-](\d{4})/,
  /(\d{4})-(\d{2})-(\d{2})/,
  /(\d{2})[./-](\d{2})[./-](\d{2})(?!\d)/,
];

// Preço de linha: exige casas decimais (evita moradas tipo "Rua X 123")
const LINE_ITEM_PATTERN =
  /^(.{3,60}?)\s+(\d{1,4}[.,]\d{2})\s*(?:€|EUR)?\s*$/i;

const NOISE_LINE =
  /^(total|subtotal|iva|taxa|desconto|troco|cart[aã]o|multibanco|nif|contribuinte|tel|telefone|obrigado)/i;

const ADDRESS_LINE =
  /^(rua|av\.?|avenida|largo|pra[cç]a|praceta|travessa|estrada|alameda|urbaniza[cç][aã]o)\b/i;

const PRICE_IN_LINE = /\d{1,4}[.,]\d{2}/;

function parsePtAmount(value: string): number | undefined {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function normalizeDate(match: RegExpMatchArray): string | undefined {
  if (match[0].includes('-') && match[1]?.length === 4) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const d = match[1];
  const m = match[2];
  let y = match[3];
  if (y.length === 2) {
    y = Number(y) > 50 ? `19${y}` : `20${y}`;
  }

  if (!d || !m || !y) return undefined;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export function parseReceiptFromRawText(text: string): Partial<ReceiptOcrResult> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let totalAmount: number | undefined;
  for (const pattern of TOTAL_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      totalAmount = parsePtAmount(match[1]);
      if (totalAmount) break;
    }
  }

  let date: string | undefined;
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      date = normalizeDate(match);
      if (date) break;
    }
  }

  const merchantName = lines.slice(0, 6).find(
    (line) =>
      line.length >= 3 &&
      line.length <= 48 &&
      !NOISE_LINE.test(line) &&
      !ADDRESS_LINE.test(line) &&
      !PRICE_IN_LINE.test(line) &&
      !/^\d+[.,]\d{2}/.test(line) &&
      !/^\d{2}[./-]\d{2}/.test(line),
  );

  const items: ReceiptOcrItem[] = [];
  for (const line of lines) {
    if (NOISE_LINE.test(line) || ADDRESS_LINE.test(line)) continue;
    const match = line.match(LINE_ITEM_PATTERN);
    if (!match) continue;

    const name = match[1].trim();
    const total = parsePtAmount(match[2]);
    if (!name || !total || total > 5000) continue;
    if (totalAmount !== undefined && total > totalAmount * 1.2) continue;

    items.push({ name, total });
  }

  return {
    merchantName,
    totalAmount,
    date,
    items: items.length > 0 ? items : undefined,
    rawText: text,
  };
}

function isPlausibleAmount(amount?: number, max = 50000): boolean {
  return amount !== undefined && amount > 0 && amount <= max;
}

function pickAmount(api?: number, parsed?: number, confidence?: number): number | undefined {
  if (isPlausibleAmount(api) && isPlausibleAmount(parsed)) {
    const diff = Math.abs(api! - parsed!) / Math.max(api!, parsed!, 1);
    if (diff < 0.02) return api;
    // Confiança baixa → preferir parse de TOTAL explícito no rawText
    if ((confidence ?? 0) < 0.65 && parsed !== undefined) return parsed;
    return api;
  }
  return isPlausibleAmount(api) ? api : parsed;
}

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
    // Soma de itens muito acima do total → descartar itens (dados OCR não fiáveis)
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
 */
export function sanitizeOcrResult(raw: ReceiptOcrResult | null): ReceiptOcrResult | null {
  if (!raw) return null;

  const parsed = raw.rawText ? parseReceiptFromRawText(raw.rawText) : {};

  const totalAmount = pickAmount(raw.totalAmount, parsed.totalAmount, raw.confidence);
  const merchantName = pickString(raw.merchantName, parsed.merchantName, raw.confidence);
  const date = pickString(raw.date, parsed.date, raw.confidence) ?? toIsoDateString();

  const mergedItems = filterItems(
    raw.items?.length ? raw.items : parsed.items,
    totalAmount,
  );

  const result: ReceiptOcrResult = {
    merchantName,
    totalAmount,
    date,
    suggestedCategory: raw.suggestedCategory ?? inferCategoryFromMerchant(merchantName),
    confidence: raw.confidence,
    rawText: raw.rawText ?? parsed.rawText,
    items: mergedItems,
  };

  const hasSignal =
    Boolean(result.merchantName) ||
    isPlausibleAmount(result.totalAmount) ||
    Boolean(result.rawText && result.rawText.length > 20);

  return hasSignal ? result : null;
}

function inferCategoryFromMerchant(merchant?: string): string | undefined {
  if (!merchant) return undefined;
  const m = merchant.toLowerCase();
  if (/continente|pingo|auchan|lidl|aldi|minipreço|intermarche|mercado/.test(m)) {
    return 'food';
  }
  if (/galp|bp|repsol|prio|uber|bolt|cp|metro/.test(m)) return 'transport';
  return undefined;
}
