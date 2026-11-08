/** Código de moeda ISO 4217 (ex.: "EUR", "USD"). */
export type CurrencyCode = string;

export const DEFAULT_CURRENCY: CurrencyCode = 'EUR';

const ISO_4217_PATTERN = /^[A-Z]{3}$/;

export function isCurrencyCode(value: string): value is CurrencyCode {
  if (!ISO_4217_PATTERN.test(value)) return false;
  try {
    new Intl.NumberFormat('en', { style: 'currency', currency: value });
    return true;
  } catch {
    return false;
  }
}

const exponentCache = new Map<CurrencyCode, number>();

/**
 * Número de casas decimais da unidade mínima da moeda (EUR → 2, JPY → 0).
 * Derivado do Intl para não manter uma tabela própria desatualizada.
 */
export function currencyExponent(currency: CurrencyCode): number {
  const cached = exponentCache.get(currency);
  if (cached !== undefined) return cached;
  const exponent =
    new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2;
  exponentCache.set(currency, exponent);
  return exponent;
}
