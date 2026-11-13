// Sem imports: este ficheiro também é usado pela Edge Function (Deno), como trading212.ts.
type CalendarDate = string;

/** Casas decimais da moeda (EUR → 2, JPY → 0), pelo Intl, como `currencyExponent`. */
function exponentOf(currency: string): number | null {
  if (!/^[A-Z]{3}$/.test(currency)) return null;
  try {
    return (
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  } catch {
    return null;
  }
}

/**
 * Open banking (ADR-069): leitura de contas através de um agregador PSD2 (Enable Banking).
 * Aqui só se interpretam respostas: sem rede, sem React. O mesmo código corre na Edge Function.
 */

/** Consentimento pedido ao banco: 90 dias, ou menos se o banco não permitir tanto. */
export const BANK_CONSENT_DAYS = 90;
/** Pedido de autorização em curso: depois disto, o regresso do banco é recusado. */
export const BANK_AUTH_STATE_TTL_MS = 30 * 60_000;
/** Intervalo mínimo entre leituras de uma ligação (os bancos limitam a ~4 por dia sem a pessoa). */
export const BANK_MIN_REFRESH_MS = 15 * 60_000;
/** Primeira leitura de movimentos: só a partir do dia em que a conta foi associada. */
export const BANK_HISTORY_DAYS = 90;

export type BankErrorCode = 'unauthorized' | 'expired' | 'rateLimited' | 'unavailable' | 'invalid';

export type BankBalance = { amount: number; currency: string; type: string };

export type BankTransaction = {
  /** Identificador estável no banco, quando existe (para não importar duas vezes). */
  id: string | null;
  date: CalendarDate;
  amount: number;
  currency: string;
  type: 'income' | 'expense';
  description: string;
};

export type Aspsp = {
  name: string;
  country: string;
  logo: string | null;
  maxConsentSeconds: number | null;
};

const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converte um valor decimal em texto ("1250.5") para unidades mínimas, sem números de vírgula
 * flutuante. Recusa (null) formatos inesperados ou mais casas decimais do que a moeda tem.
 */
export function decimalToMinor(value: unknown, currency: string): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const match = DECIMAL.exec(String(value).trim());
  const exponent = exponentOf(currency);
  if (!match || exponent === null) return null;
  const [, sign, whole, fraction = ''] = match;
  const trimmed = fraction.replace(/0+$/, '');
  if (trimmed.length > exponent) return null;
  const minor = Number(`${whole}${trimmed.padEnd(exponent, '0')}`);
  if (!Number.isSafeInteger(minor)) return null;
  return sign === '-' && minor !== 0 ? -minor : minor;
}

/** Ordem de preferência: saldo contabilístico (o que os movimentos da app explicam) primeiro. */
const BALANCE_PREFERENCE = ['ITBD', 'CLBD', 'XPCD', 'ITAV', 'CLAV', 'OPBD', 'OPAV', 'PRCD'];

export function pickBalance(response: unknown): BankBalance | null {
  const list = (response as { balances?: unknown } | null)?.balances;
  if (!Array.isArray(list)) return null;
  const parsed: BankBalance[] = [];
  for (const item of list) {
    const raw = item as {
      balance_amount?: { amount?: unknown; currency?: unknown };
      balance_type?: unknown;
    };
    const currency =
      typeof raw.balance_amount?.currency === 'string' ? raw.balance_amount.currency : '';
    const amount = decimalToMinor(raw.balance_amount?.amount, currency);
    if (amount === null) continue;
    parsed.push({
      amount,
      currency,
      type: typeof raw.balance_type === 'string' ? raw.balance_type : '',
    });
  }
  const rank = (type: string) => {
    const index = BALANCE_PREFERENCE.indexOf(type);
    return index === -1 ? BALANCE_PREFERENCE.length : index;
  };
  return parsed.sort((a, b) => rank(a.type) - rank(b.type))[0] ?? null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

/**
 * Movimentos contabilizados (`BOOK`) de uma página de `/transactions`. Os pendentes ficam de fora:
 * ainda podem mudar de valor ou desaparecer.
 */
export function parseTransactions(response: unknown): BankTransaction[] {
  const list = (response as { transactions?: unknown } | null)?.transactions;
  if (!Array.isArray(list)) return [];
  const result: BankTransaction[] = [];
  for (const item of list) {
    const raw = item as Record<string, unknown>;
    if (raw.status !== undefined && raw.status !== 'BOOK') continue;
    const money = raw.transaction_amount as { amount?: unknown; currency?: unknown } | undefined;
    const currency = typeof money?.currency === 'string' ? money.currency : '';
    const signed = decimalToMinor(money?.amount, currency);
    if (signed === null || signed === 0) continue;
    const date = [raw.booking_date, raw.value_date, raw.transaction_date].find(
      (value): value is string => typeof value === 'string' && DATE.test(value),
    );
    if (!date) continue;
    const indicator = raw.credit_debit_indicator;
    const type: BankTransaction['type'] =
      indicator === 'CRDT'
        ? 'income'
        : indicator === 'DBIT'
          ? 'expense'
          : signed < 0
            ? 'expense'
            : 'income';
    const counterparty = text(
      ((type === 'expense' ? raw.creditor : raw.debtor) as { name?: unknown } | undefined)?.name,
    );
    const remittance = Array.isArray(raw.remittance_information)
      ? raw.remittance_information.map(text).filter(Boolean).join(' ')
      : text(raw.remittance_information);
    const id = text(raw.transaction_id) || text(raw.entry_reference) || null;
    result.push({
      id,
      date,
      amount: Math.abs(signed),
      currency,
      type,
      description: (counterparty || remittance).slice(0, 200),
    });
  }
  return result;
}

export function parseAspsps(response: unknown): Aspsp[] {
  const list = (response as { aspsps?: unknown } | null)?.aspsps;
  if (!Array.isArray(list)) return [];
  const result: Aspsp[] = [];
  for (const item of list) {
    const raw = item as Record<string, unknown>;
    const name = text(raw.name);
    const country = text(raw.country);
    if (!name || !/^[A-Z]{2}$/.test(country)) continue;
    const psuTypes = Array.isArray(raw.psu_types) ? raw.psu_types : ['personal'];
    if (!psuTypes.includes('personal')) continue;
    result.push({
      name,
      country,
      logo: typeof raw.logo === 'string' && raw.logo.startsWith('https://') ? raw.logo : null,
      maxConsentSeconds:
        typeof raw.maximum_consent_validity === 'number' ? raw.maximum_consent_validity : null,
    });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/** Data-limite do consentimento: 90 dias, ou o máximo que o banco aceitar. */
export function consentValidUntil(maxConsentSeconds: number | null, now: number): string {
  const wanted = BANK_CONSENT_DAYS * 86_400;
  const seconds =
    maxConsentSeconds && maxConsentSeconds > 0 ? Math.min(wanted, maxConsentSeconds) : wanted;
  return new Date(now + (seconds - 60) * 1000).toISOString();
}

export function bankErrorFromStatus(status: number): BankErrorCode {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 429) return 'rateLimited';
  if (status === 408 || status >= 500) return 'unavailable';
  return 'invalid';
}

export function canRefreshBank(lastSyncAt: string | null, now: number): boolean {
  if (!lastSyncAt) return true;
  const last = Date.parse(lastSyncAt);
  return !Number.isFinite(last) || now - last >= BANK_MIN_REFRESH_MS;
}

/** Últimos 4 caracteres do IBAN, para a pessoa reconhecer a conta (nunca o IBAN completo). */
export function ibanLast4(value: unknown): string | null {
  const clean = text(value).replace(/\s/g, '').toUpperCase();
  return /^[A-Z0-9]{5,34}$/.test(clean) ? clean.slice(-4) : null;
}
