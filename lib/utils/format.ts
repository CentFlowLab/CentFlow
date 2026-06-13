const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_LOCALE = 'pt-PT';

let activeCurrency = DEFAULT_CURRENCY;
let activeLocale = DEFAULT_LOCALE;

export type FormatContext = {
  currency?: string;
  locale?: string;
};

export function setFormatContext(context: FormatContext): void {
  if (context.currency) activeCurrency = context.currency;
  if (context.locale) activeLocale = context.locale;
}

export function getFormatContext(): { currency: string; locale: string } {
  return { currency: activeCurrency, locale: activeLocale };
}

export function formatCurrency(
  value: number,
  currency: string = activeCurrency,
): string {
  return new Intl.NumberFormat(activeLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1, showSign = true): string {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatCompactCurrency(value: number, currency = activeCurrency): string {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat(activeLocale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return formatCurrency(value, currency);
}

export function formatDateShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return new Intl.DateTimeFormat(activeLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function toIsoDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateLong(date: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat(activeLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatRelativeDays(days: number): string {
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  if (days < 0) return `Há ${Math.abs(days)} dias`;
  return `Em ${days} dias`;
}

export function daysUntil(dateIso: string): number {
  const target = new Date(dateIso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
