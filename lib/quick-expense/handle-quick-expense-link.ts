/**
 * Parsing puro do deep link de despesa rápida:
 *   centflow://quick-expense?amount=25&category=food&note=Almoço
 *
 * Mantido sem dependências de React Native / expo para ser 100% testável em Node.
 * O componente QuickExpenseLinkHandler usa expo-linking para receber os URLs e
 * delega aqui a interpretação dos parâmetros.
 */

/** Keys canónicas de categoria aceites no URL (inglês). */
export type QuickExpenseCategoryKey =
  | 'food'
  | 'transport'
  | 'home'
  | 'health'
  | 'shopping'
  | 'leisure'
  | 'subscriptions'
  | 'other';

export interface QuickExpenseParams {
  amount: number;
  category: string;
  note?: string;
}

type QueryValue = string | string[] | undefined | null;

/**
 * Aceita tanto as keys inglesas (food) como os nomes em português (Alimentação),
 * case-insensitive e ignorando acentos. Tudo o que não corresponder cai em 'other'.
 */
const KEY_ALIASES: Record<string, QuickExpenseCategoryKey> = {
  // Alimentação
  food: 'food',
  alimentacao: 'food',
  alimentacaoerestauracao: 'food',
  // Transportes
  transport: 'transport',
  transporte: 'transport',
  transportes: 'transport',
  // Habitação
  home: 'home',
  habitacao: 'home',
  casa: 'home',
  // Saúde
  health: 'health',
  saude: 'health',
  // Compras
  shopping: 'shopping',
  compras: 'shopping',
  // Lazer
  leisure: 'leisure',
  lazer: 'leisure',
  lazereentretenimento: 'leisure',
  // Subscrições
  subscriptions: 'subscriptions',
  subscricao: 'subscriptions',
  subscricoes: 'subscriptions',
  // Outros
  other: 'other',
  outro: 'other',
  outros: 'other',
};

/** Key canónica → id de categoria usado na app ao guardar o movimento. */
const APP_CATEGORY_BY_KEY: Record<QuickExpenseCategoryKey, string> = {
  food: 'food',
  transport: 'transport',
  home: 'housing',
  health: 'health',
  shopping: 'shopping',
  leisure: 'leisure',
  subscriptions: 'subscriptions',
  other: 'other',
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function firstValue(value: QueryValue): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

/** Normaliza qualquer entrada (key ou nome PT) para uma key canónica. */
export function normalizeCategoryKey(input?: string | null): QuickExpenseCategoryKey {
  if (!input) return 'other';
  const normalized = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
  return KEY_ALIASES[normalized] ?? 'other';
}

/** Key canónica (ou nome PT) → id de categoria da app. */
export function mapCategoryKey(category?: string | null): string {
  return APP_CATEGORY_BY_KEY[normalizeCategoryKey(category)];
}

function parseAmount(raw?: string): number | null {
  if (raw === undefined) return null;
  const normalized = raw.replace(',', '.').trim();
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function sanitizeNote(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    // remove caracteres perigosos / controlo
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, 100);
}

function parseQueryString(qs: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of qs.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
    const key = safeDecode(rawKey).trim().toLowerCase();
    if (!key) continue;
    out[key] = safeDecode(rawValue);
  }
  return out;
}

/**
 * Interpreta um objecto de query params (ex.: vindo de expo-linking ou
 * useLocalSearchParams). Devolve null se `amount` não for um número positivo válido.
 */
export function parseQuickExpenseParams(
  query: Record<string, QueryValue>,
): QuickExpenseParams | null {
  const amount = parseAmount(firstValue(query.amount));
  if (amount === null) return null;

  const category = normalizeCategoryKey(firstValue(query.category));
  const note = sanitizeNote(firstValue(query.note));

  return note !== undefined ? { amount, category, note } : { amount, category };
}

/**
 * Interpreta um URL completo (`centflow://quick-expense?...`) ou apenas a
 * query string (`amount=25&category=food`). Devolve null em caso inválido.
 */
export function parseQuickExpenseUrl(url: string): QuickExpenseParams | null {
  if (!url) return null;
  const queryString = url.includes('?') ? url.slice(url.indexOf('?') + 1) : url;
  return parseQuickExpenseParams(parseQueryString(queryString));
}
