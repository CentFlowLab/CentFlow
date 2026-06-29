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
  if (!Number.isFinite(value)) return '—';
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
  if (!Number.isFinite(value)) return '—';
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

export const DATE_INPUT_PLACEHOLDER = 'DD-MM-AAAA';

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const PT_INPUT_DATE_RE = /^(\d{2})-(\d{2})-(\d{4})$/;

/** ISO (YYYY-MM-DD) → DD-MM-AAAA para campos de texto. */
export function isoToInputDate(iso: string): string {
  if (!iso) return '';
  const match = iso.match(ISO_DATE_RE);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

/** Converte ISO ou DD-MM-AAAA para apresentação em inputs. */
export function formatInputDate(value?: string | Date | null): string {
  if (value == null || value === '') return '';
  if (value instanceof Date) return isoToInputDate(toIsoDateString(value));
  if (ISO_DATE_RE.test(value)) return isoToInputDate(value);
  return value;
}

/** DD-MM-AAAA (ou ISO legado) → YYYY-MM-DD para armazenamento/API. */
export function inputDateToIso(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const pt = trimmed.match(PT_INPUT_DATE_RE);
  if (pt) {
    const [, day, month, year] = pt;
    return `${year}-${month}-${day}`;
  }

  if (ISO_DATE_RE.test(trimmed)) return trimmed;

  return undefined;
}

export function isValidInputDate(input: string): boolean {
  const iso = inputDateToIso(input);
  if (!iso) return false;

  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function todayInputDate(): string {
  return formatInputDate(new Date());
}

/** DD-MM-AAAA ou ISO → Date local (meia-noite). */
export function inputDateToDate(input: string): Date | null {
  const iso = inputDateToIso(input);
  if (!iso) return null;

  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

export function dateToInputDate(date: Date): string {
  return formatInputDate(date);
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

export function daysUntil(dateIso: string, asOf: Date = new Date()): number {
  const target = new Date(dateIso);
  const today = new Date(asOf);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
