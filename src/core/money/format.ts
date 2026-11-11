import type { Money } from './money';
import { currencyExponent } from './currency';
import { toMajorUnits } from './money';

export type FormatMoneyOptions = {
  /** "always" mostra "+" em valores positivos (útil para rendimentos). */
  signDisplay?: 'auto' | 'always' | 'exceptZero' | 'never';
  /** Notação compacta (ex.: "12,3 mil €") para gráficos e espaços reduzidos. */
  compact?: boolean;
  /** Esconde as casas decimais quando o valor é inteiro (ex.: "1200 €" em vez de "1200,00 €"). */
  trimZeroDecimals?: boolean;
};

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(
  locale: string,
  currency: string,
  signDisplay: NonNullable<FormatMoneyOptions['signDisplay']>,
  compact: boolean,
  noFraction: boolean,
): Intl.NumberFormat {
  const key = [locale, currency, signDisplay, compact, noFraction].join('|');
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      signDisplay,
      ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
      ...(noFraction ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

export function formatMoney(
  value: Money,
  locale: string,
  options: FormatMoneyOptions = {},
): string {
  const major = toMajorUnits(value.amountMinor, value.currency);
  const noFraction = Boolean(options.trimZeroDecimals) && Number.isInteger(major);
  return getFormatter(
    locale,
    value.currency,
    options.signDisplay ?? 'auto',
    Boolean(options.compact),
    noFraction,
  ).format(major);
}

/**
 * Preço por unidade (ex.: por litro ou por km) a partir de unidades mínimas com decimais:
 * uma casa a mais do que a moeda (172,57 cêntimos → "1,726 €"). Arredonda só aqui.
 */
export function formatUnitPrice(minorPerUnit: number, currency: string, locale: string): string {
  const digits = currencyExponent(currency) + 1;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toMajorUnits(minorPerUnit, currency));
}
