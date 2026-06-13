/**
 * Parser de talões portugueses — regras PT (NIF, ATCUD, IVA, totais).
 * Usado no client (ocr-sanitize) e na Edge Function (cópia em supabase/functions/_shared).
 */

export type ParsedReceiptItem = {
  name: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
};

export type ParsedReceipt = {
  merchantName?: string;
  totalAmount?: number;
  date?: string;
  items?: ParsedReceiptItem[];
  nif?: string;
  atcud?: string;
  vatAmount?: number;
  vatRate?: number;
  documentType?: string;
  rawText: string;
  confidence: number;
};

const TOTAL_PATTERNS = [
  /(?:TOTAL\s*(?:EUR|€)?|VALOR\s*TOTAL|IMPORTE\s*TOTAL|TOTAL\s*A\s*PAGAR|A\s*PAGAR|TOTAL\s*GERAL)\s*[:\s]*€?\s*(\d{1,6}[.,]\d{2})/gi,
  /(?:^|\n)\s*Total\s*[\r\n]+\s*(\d{1,6}[.,]\d{2})\s*(?:EUR|€)?/gim,
  /Total[^\d\n]{0,24}(\d{1,6}[.,]\d{2})\s*(?:EUR|€)?/gi,
  /(?:^|\n)\s*TOTAL\s*[:\s]*(\d{1,6}[.,]\d{2})/gim,
  /(\d{1,6}[.,]\d{2})\s*EUR\s*$/gim,
];

const RETAIL_BRANDS =
  /\b(lidl|continente|pingo\s*doce|auchan|worten|mediamarkt|ikea|decathlon|galp|bp|repsol|prio|minipre[cç]o|intermarche|aldi|el\s*corte\s*ingl[eé]s|fnac|staples)\b/i;

const DATE_PATTERNS = [
  /(\d{2})[./-](\d{2})[./-](\d{4})/g,
  /(\d{4})-(\d{2})-(\d{2})/g,
  /(\d{2})[./-](\d{2})[./-](\d{2})(?!\d)/g,
  /(?:data|date)\s*[:\s]*(\d{2})[./-](\d{2})[./-](\d{2,4})/gi,
];

const NIF_PATTERN = /(?:NIF|N\.?I\.?F\.?|Contribuinte|Contrib\.?)\s*[:\s#]*(\d{9})/gi;
const ATCUD_PATTERN = /ATCUD\s*[:\s]*([A-Z0-9]{4,8}-\d+)/gi;
const IVA_LINE_PATTERN =
  /IVA\s*(?:\(?\s*(\d{1,2})\s*%?\s*\)?)?\s*[:\s]*(\d{1,6}[.,]\d{2})/gi;
const DOC_TYPE_PATTERN =
  /\b(FATURA\s*SIMPLIFICADA|FATURA-RECIBO|FATURA|RECIBO|FS|FR|FT|Tal[aã]o|Documento\s*de\s*venda)\b/i;

const LINE_ITEM_PATTERN =
  /^(.{3,55}?)\s+(\d{1,4}[.,]\d{2})\s*(?:€|EUR)?\s*$/i;
const LINE_ITEM_QTY_PATTERN =
  /^(.{3,45}?)\s+(\d+[.,]?\d*)\s*[xX×]\s*(\d{1,4}[.,]\d{2})\s*(?:€|EUR)?\s*$/i;

const NOISE_LINE =
  /^(total|subtotal|iva|taxa|desconto|troco|cart[aã]o|multibanco|mb\s*way|nif|contribuinte|tel|telefone|obrigado|atcud|processado|certifica[cç][aã]o|software|operador|utilizador|mesa|doc\.|documento)/i;

const ADDRESS_LINE =
  /^(rua|av\.?|avenida|largo|pra[cç]a|praceta|travessa|estrada|alameda|urbaniza[cç][aã]o|zona\s*industrial)\b/i;

const PRICE_IN_LINE = /\d{1,4}[.,]\d{2}/;

export function parsePtAmount(value: string): number | undefined {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function normalizeDate(match: RegExpMatchArray): string | undefined {
  if (match[1]?.length === 4 && match[0].includes('-')) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const d = match[1];
  const m = match[2];
  let y = match[3];
  if (y.length === 2) {
    y = Number(y) > 50 ? `19${y}` : `20${y}`;
  }

  if (!d || !m || !y) return undefined;
  const day = Number(d);
  const month = Number(m);
  if (day < 1 || day > 31 || month < 1 || month > 12) return undefined;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function extractAllTotals(text: string): number[] {
  const totals: number[] = [];

  for (const pattern of TOTAL_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const amount = parsePtAmount(match[1]);
      if (amount && amount <= 50000) totals.push(amount);
    }
  }

  return totals;
}

function pickBestTotal(totals: number[]): number | undefined {
  if (totals.length === 0) return undefined;
  // Preferir o maior total plausível (último TOTAL no talão)
  return totals[totals.length - 1];
}

function extractNif(text: string): string | undefined {
  NIF_PATTERN.lastIndex = 0;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = NIF_PATTERN.exec(text)) !== null) {
    if (match[1] && isValidPtNif(match[1])) matches.push(match[1]);
  }
  // NIF do cliente costuma aparecer depois do da loja — preferir último válido != loja comum
  return matches[matches.length - 1];
}

/** Validação checksum NIF português */
export function isValidPtNif(nif: string): boolean {
  if (!/^\d{9}$/.test(nif)) return false;
  const first = Number(nif[0]);
  if (![1, 2, 3, 5, 6, 7, 8, 9].includes(first)) return false;

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += Number(nif[i]) * (9 - i);
  }
  const mod = sum % 11;
  const check = mod < 2 ? 0 : 11 - mod;
  return check === Number(nif[8]);
}

function extractAtcud(text: string): string | undefined {
  ATCUD_PATTERN.lastIndex = 0;
  const match = ATCUD_PATTERN.exec(text);
  return match?.[1];
}

function extractVat(text: string): { vatAmount?: number; vatRate?: number } {
  IVA_LINE_PATTERN.lastIndex = 0;
  let lastRate: number | undefined;
  let lastAmount: number | undefined;
  let match: RegExpExecArray | null;

  while ((match = IVA_LINE_PATTERN.exec(text)) !== null) {
    if (match[1]) lastRate = Number(match[1]);
    const amount = parsePtAmount(match[2]);
    if (amount) lastAmount = amount;
  }

  return { vatAmount: lastAmount, vatRate: lastRate };
}

function extractDate(text: string): string | undefined {
  const dates: string[] = [];

  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const normalized = normalizeDate(match);
      if (normalized) dates.push(normalized);
    }
  }

  return dates[0];
}

function extractMerchant(lines: string[]): string | undefined {
  const brand = lines.slice(0, 15).find(
    (line) =>
      RETAIL_BRANDS.test(line) &&
      line.length >= 3 &&
      line.length <= 56 &&
      !NOISE_LINE.test(line),
  );
  if (brand) return brand.replace(/\s+/g, ' ').trim();

  return lines.slice(0, 10).find(
    (line) =>
      line.length >= 3 &&
      line.length <= 56 &&
      !NOISE_LINE.test(line) &&
      !ADDRESS_LINE.test(line) &&
      !PRICE_IN_LINE.test(line) &&
      !/^\d+[.,]\d{2}/.test(line) &&
      !/^\d{2}[./-]\d{2}/.test(line) &&
      !/^nif\b/i.test(line) &&
      !ATCUD_PATTERN.test(line),
  );
}

function extractItems(lines: string[], totalAmount?: number): ParsedReceiptItem[] {
  const items: ParsedReceiptItem[] = [];

  for (const line of lines) {
    if (NOISE_LINE.test(line) || ADDRESS_LINE.test(line)) continue;

    const qtyMatch = line.match(LINE_ITEM_QTY_PATTERN);
    if (qtyMatch) {
      const name = qtyMatch[1].trim();
      const quantity = parsePtAmount(qtyMatch[2]) ?? Number(qtyMatch[2].replace(',', '.'));
      const total = parsePtAmount(qtyMatch[3]);
      if (name && total && total <= 5000) {
        if (totalAmount === undefined || total <= totalAmount * 1.2) {
          items.push({ name, quantity, total });
        }
      }
      continue;
    }

    const match = line.match(LINE_ITEM_PATTERN);
    if (!match) continue;

    const name = match[1].trim();
    const total = parsePtAmount(match[2]);
    if (!name || !total || total > 5000) continue;
    if (totalAmount !== undefined && total > totalAmount * 1.2) continue;

    items.push({ name, total });
  }

  return items.slice(0, 20);
}

function scoreParsedReceipt(parsed: Omit<ParsedReceipt, 'confidence' | 'rawText'>): number {
  let score = 0;
  if (parsed.merchantName) score += 0.2;
  if (parsed.totalAmount !== undefined) score += 0.3;
  if (parsed.date) score += 0.1;
  if (parsed.nif) score += 0.05;
  if (parsed.atcud) score += 0.1;
  if (parsed.items && parsed.items.length > 0) score += 0.15;
  if (parsed.vatAmount !== undefined) score += 0.05;
  return Math.min(score, 1);
}

export function parseReceiptFromRawText(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const totals = extractAllTotals(text);
  const totalAmount = pickBestTotal(totals);
  const date = extractDate(text);
  const merchantName = extractMerchant(lines);
  const nif = extractNif(text);
  const atcud = extractAtcud(text);
  const { vatAmount, vatRate } = extractVat(text);
  const docMatch = text.match(DOC_TYPE_PATTERN);
  const items = extractItems(lines, totalAmount);

  const parsed = {
    merchantName,
    totalAmount,
    date,
    items: items.length > 0 ? items : undefined,
    nif,
    atcud,
    vatAmount,
    vatRate,
    documentType: docMatch?.[1],
    rawText: text,
  };

  return {
    ...parsed,
    confidence: scoreParsedReceipt(parsed),
  };
}

export function inferCategoryFromMerchant(merchant?: string): string | undefined {
  if (!merchant) return undefined;
  const m = merchant.toLowerCase();
  if (/continente|pingo|auchan|lidl|aldi|minipre[cç]o|intermarche|mercado|el corte/.test(m)) {
    return 'food';
  }
  if (/galp|bp|repsol|prio|uber|bolt|cp|metro|fertagus/.test(m)) return 'transport';
  if (/worten|mediamarkt|fnac|pccomponentes|apple|samsung|staples/.test(m)) return 'shopping';
  if (/ikea|leroy|aki|bricomarch/.test(m)) return 'housing';
  return undefined;
}
