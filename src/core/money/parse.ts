import { currencyExponent, type CurrencyCode } from './currency';

/** Limite de segurança: 10 mil milhões em unidades principais (soma segura em inteiros). */
export const MAX_AMOUNT_MINOR = 1_000_000_000_000;

export type ParseAmountResult =
  { ok: true; amountMinor: number } | { ok: false; error: 'empty' | 'invalid' | 'tooLarge' };

/**
 * Converte texto escrito pelo utilizador ("12,5", "1.234,56", "1,234.56", "-30")
 * em unidades mínimas inteiras, sem passar por números decimais.
 *
 * Regra: o último separador ("," ou ".") seguido de 1 até `expoente` algarismos é o decimal;
 * os restantes são separadores de milhares.
 */
export function parseAmountInput(
  input: string,
  currency: CurrencyCode,
  { allowNegative = false }: { allowNegative?: boolean } = {},
): ParseAmountResult {
  let text = input.replace(/[\s\u00A0\u202F]/g, '');
  if (text === '') return { ok: false, error: 'empty' };

  let negative = false;
  if (text.startsWith('-') || text.startsWith('−')) {
    if (!allowNegative) return { ok: false, error: 'invalid' };
    negative = true;
    text = text.slice(1);
  }
  if (!/^[\d.,]+$/.test(text) || !/\d/.test(text)) return { ok: false, error: 'invalid' };

  const exponent = currencyExponent(currency);
  let integerPart = text;
  let fractionPart = '';

  const lastSeparator = Math.max(text.lastIndexOf(','), text.lastIndexOf('.'));
  if (lastSeparator !== -1) {
    const tail = text.slice(lastSeparator + 1);
    const head = text.slice(0, lastSeparator);
    const sameSeparatorRepeats = head.includes(text[lastSeparator] as string);
    const looksDecimal =
      exponent > 0 && tail.length >= 1 && tail.length <= exponent && !sameSeparatorRepeats;
    if (looksDecimal) {
      integerPart = head;
      fractionPart = tail;
    } else if (tail.length !== 3) {
      // Um separador de milhares tem sempre grupos de 3 algarismos.
      return { ok: false, error: 'invalid' };
    }
  }

  const groups = integerPart.split(/[.,]/);
  if (groups.length > 1) {
    const [first, ...rest] = groups;
    if (!first || first.length > 3 || rest.some((group) => group.length !== 3)) {
      return { ok: false, error: 'invalid' };
    }
  }
  const digits = groups.join('') || '0';
  const normalized = `${digits}${fractionPart.padEnd(exponent, '0')}`.replace(/^0+(?=\d)/, '');

  if (normalized.length > String(MAX_AMOUNT_MINOR).length) return { ok: false, error: 'tooLarge' };
  const amountMinor = Number(normalized);
  if (!Number.isSafeInteger(amountMinor) || amountMinor > MAX_AMOUNT_MINOR) {
    return { ok: false, error: 'tooLarge' };
  }
  return { ok: true, amountMinor: negative && amountMinor !== 0 ? -amountMinor : amountMinor };
}

/** Representação editável de um valor (ex.: 1250 → "12,50"), sem separadores de milhares. */
export function amountToInputString(
  amountMinor: number,
  currency: CurrencyCode,
  decimalSeparator: ',' | '.',
): string {
  const exponent = currencyExponent(currency);
  const sign = amountMinor < 0 ? '-' : '';
  const digits = String(Math.abs(amountMinor)).padStart(exponent + 1, '0');
  if (exponent === 0) return `${sign}${digits}`;
  const integer = digits.slice(0, -exponent);
  const fraction = digits.slice(-exponent);
  return `${sign}${integer}${decimalSeparator}${fraction}`;
}

export function decimalSeparatorFor(locale: string): ',' | '.' {
  const part = new Intl.NumberFormat(locale)
    .formatToParts(1.5)
    .find((candidate) => candidate.type === 'decimal');
  return part?.value === ',' ? ',' : '.';
}
