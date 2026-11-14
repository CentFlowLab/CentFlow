/**
 * Datas de calendário sem hora nem fuso ("YYYY-MM-DD") e meses ("YYYY-MM").
 * Movimentos usam a data local escolhida pelo utilizador; evita erros de fuso horário
 * nos resumos mensais.
 */
export type CalendarDate = string;
export type MonthKey = string;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidCalendarDate(value: string): value is CalendarDate {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < MIN_YEAR || year > MAX_YEAR) return false;
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

export function isValidMonthKey(value: string): value is MonthKey {
  const match = MONTH_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return year >= MIN_YEAR && year <= MAX_YEAR && month >= 1 && month <= 12;
}

/** Data local do dispositivo (não UTC). */
export function toCalendarDate(date: Date): CalendarDate {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Converte para Date à meia-noite local (para formatação). */
export function calendarDateToLocalDate(value: CalendarDate): Date {
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
}

export function addDays(value: CalendarDate, days: number): CalendarDate {
  const date = calendarDateToLocalDate(value);
  date.setDate(date.getDate() + days);
  return toCalendarDate(date);
}

export function monthOf(value: CalendarDate): MonthKey {
  return value.slice(0, 7);
}

export function addMonths(month: MonthKey, delta: number): MonthKey {
  const [year, monthIndex] = month.split('-').map(Number) as [number, number];
  const total = year * 12 + (monthIndex - 1) + delta;
  return `${pad(Math.floor(total / 12), 4)}-${pad((total % 12) + 1)}`;
}

/** Primeiro e último dia (inclusive) do mês. */
export function monthRange(month: MonthKey): { start: CalendarDate; end: CalendarDate } {
  const [year, monthIndex] = month.split('-').map(Number) as [number, number];
  return {
    start: `${month}-01`,
    end: `${month}-${pad(daysInMonth(year, monthIndex))}`,
  };
}

/** Lista de meses consecutivos terminando em `lastMonth` (inclusive). */
export function monthsEndingAt(lastMonth: MonthKey, count: number): MonthKey[] {
  return Array.from({ length: count }, (_, index) => addMonths(lastMonth, index - count + 1));
}

export function monthKeyToLocalDate(month: MonthKey): Date {
  return calendarDateToLocalDate(`${month}-01`);
}

/** Mês a partir do ano e do número do mês (1–12): (2025, 6) → "2025-06". */
export function monthKeyFrom(year: number, month: number): MonthKey {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

/** Limita um mês ao intervalo suportado (MIN_YEAR-01 a MAX_YEAR-12). */
export function clampMonthKey(month: MonthKey): MonthKey {
  const min = monthKeyFrom(MIN_YEAR, 1);
  const max = monthKeyFrom(MAX_YEAR, 12);
  return month < min ? min : month > max ? max : month;
}
