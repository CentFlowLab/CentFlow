import { inputDateToIso } from '@/lib/utils/format';

const MIN_VALID_YEAR = 1970;
const MAX_VALID_YEAR = 2100;

/** Parseia data ISO (YYYY-MM-DD) em meio-dia local. */
export function parseIsoDate(date: string): Date {
  const key = date.slice(0, 10);
  return new Date(`${key}T12:00:00`);
}

/** Aceita ISO ou DD-MM-AAAA de formulários. */
export function parseFinancialDate(date: string): Date | null {
  const iso = inputDateToIso(date) ?? (date.length >= 10 ? date.slice(0, 10) : null);
  if (!iso) return null;
  const parsed = parseIsoDate(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  if (!isValidYear(parsed.getFullYear())) return null;
  return parsed;
}

export function isValidYear(year: number): boolean {
  return Number.isFinite(year) && year >= MIN_VALID_YEAR && year <= MAX_VALID_YEAR;
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function getMonthKey(date: Date | string): string {
  const parsed = typeof date === 'string' ? parseFinancialDate(date) : date;
  if (!parsed || Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function isSameMonth(date: string | Date, monthKey: string): boolean {
  const key = typeof date === 'string' ? getMonthKey(date) : getMonthKey(date);
  return key !== '' && key === monthKey;
}

export function isTransactionOccurred(date: string, asOf: Date = new Date()): boolean {
  const parsed = parseFinancialDate(date) ?? parseIsoDate(date);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed <= endOfDay(asOf);
}

export function isTransactionFuture(date: string, asOf: Date = new Date()): boolean {
  const parsed = parseFinancialDate(date) ?? parseIsoDate(date);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed > endOfDay(asOf);
}

export type FinancialPeriod =
  | { kind: 'month'; monthKey: string; asOf?: Date }
  | { kind: 'rolling'; days: number; offsetDays?: number; asOf?: Date }
  | { kind: 'range'; start: string; end: string; asOf?: Date };

export function getCurrentMonthRange(asOf: Date = new Date()): { start: Date; end: Date; monthKey: string } {
  const monthKey = getMonthKey(asOf);
  const [year, month] = monthKey.split('-').map(Number);
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end, monthKey };
}

export function getPreviousMonthRange(asOf: Date = new Date()): { start: Date; end: Date; monthKey: string } {
  const cursor = new Date(asOf.getFullYear(), asOf.getMonth() - 1, 15);
  return getCurrentMonthRange(cursor);
}

export function getLastNDaysRange(days: number, asOf: Date = new Date()): { start: Date; end: Date } {
  const end = endOfDay(asOf);
  const start = startOfDay(asOf);
  start.setDate(start.getDate() - (days - 1));
  return { start, end };
}

export function getLastNMonthsRange(count: number, asOf: Date = new Date()): { monthKeys: string[] } {
  const keys: string[] = [];
  const cursor = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
  for (let i = 0; i < count; i += 1) {
    keys.unshift(getMonthKey(cursor));
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return { monthKeys: keys.filter(Boolean) };
}

export function isWithinPeriod(date: string, period: FinancialPeriod): boolean {
  const parsed = parseFinancialDate(date) ?? parseIsoDate(date);
  if (Number.isNaN(parsed.getTime()) || !isValidYear(parsed.getFullYear())) return false;

  if (period.kind === 'month') {
    const asOf = period.asOf ?? new Date();
    if (!isTransactionOccurred(date, asOf)) return false;
    return isSameMonth(date, period.monthKey);
  }

  if (period.kind === 'rolling') {
    const asOf = period.asOf ?? new Date();
    if (!isTransactionOccurred(date, asOf)) return false;
    const offset = period.offsetDays ?? 0;
    const end = endOfDay(asOf);
    end.setDate(end.getDate() - offset);
    const start = startOfDay(end);
    start.setDate(start.getDate() - (period.days - 1));
    return parsed >= start && parsed <= end;
  }

  const asOf = period.asOf ?? new Date();
  if (!isTransactionOccurred(date, asOf)) return false;
  const start = parseFinancialDate(period.start) ?? parseIsoDate(period.start);
  const end = parseFinancialDate(period.end) ?? parseIsoDate(period.end);
  return parsed >= startOfDay(start) && parsed <= endOfDay(end);
}
