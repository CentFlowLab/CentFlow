import {
  addMonths,
  MAX_YEAR,
  MIN_YEAR,
  monthOf,
  monthRange,
  monthsEndingAt,
  type CalendarDate,
  type MonthKey,
} from './dates';
import type { DatedTotal } from './reports';
import type { Id } from './types';

/**
 * Mês financeiro (ADR-077): o período mensal começa no dia que a pessoa escolhe (1–31).
 *
 * Nome do período: o do mês com mais dias dentro dele. Início 1–15 → o mês em que COMEÇA
 * (5 nov–4 dez = "novembro"); início 16–31 → o mês em que TERMINA (25 out–24 nov = "novembro").
 * Início 1 = mês civil, sem nenhuma diferença.
 *
 * Meses mais curtos: o dia de início fica limitado ao último dia desse mês (31 → 30, 29 ou 28).
 * Os períodos são contíguos: o fim de um é o dia anterior ao início do seguinte, sem buracos nem
 * sobreposições, por isso cada dia pertence a um só período. Datas em texto, sem UTC.
 */
export type FinancialMonthStartDay = number;

export function isValidStartDay(value: unknown): value is FinancialMonthStartDay {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31;
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

function lastDayOf(month: MonthKey): number {
  return Number(monthRange(month).end.slice(8));
}

/** O dia de início em `month`, limitado ao último dia desse mês. */
function startIn(month: MonthKey, startDay: number): CalendarDate {
  return `${month}-${pad(Math.min(startDay, lastDayOf(month)))}`;
}

/** Dia anterior, em aritmética de calendário (sem fusos). */
function previousDay(date: CalendarDate): CalendarDate {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  if (day > 1) return `${date.slice(0, 8)}${pad(day - 1)}`;
  const previous = addMonths(`${pad(year, 4)}-${pad(month)}`, -1);
  return monthRange(previous).end;
}

const MIN_DATE = `${MIN_YEAR}-01-01`;
const MAX_DATE = `${MAX_YEAR}-12-31`;

/** Primeiro e último dia (inclusive) do período financeiro com o nome `key`. */
export function financialMonthRange(
  key: MonthKey,
  startDay: FinancialMonthStartDay = 1,
): { start: CalendarDate; end: CalendarDate } {
  if (startDay <= 1) return monthRange(key);
  const first = startDay <= 15 ? key : addMonths(key, -1);
  const start = startIn(first, startDay);
  const end = previousDay(startIn(addMonths(first, 1), startDay));
  // Nos limites do calendário suportado, o período fica dentro dele.
  return { start: start < MIN_DATE ? MIN_DATE : start, end: end > MAX_DATE ? MAX_DATE : end };
}

/** Nome (chave) do período financeiro que contém `date`. */
export function financialMonthOf(
  date: CalendarDate,
  startDay: FinancialMonthStartDay = 1,
): MonthKey {
  if (startDay <= 1) return monthOf(date);
  const month = monthOf(date);
  // O período que começa neste mês, ou o anterior, contém a data.
  const startsHere = date >= startIn(month, startDay);
  const firstMonth = startsHere ? month : addMonths(month, -1);
  return startDay <= 15 ? firstMonth : addMonths(firstMonth, 1);
}

/** Chaves consecutivas terminando em `key` (as chaves são meses: iguais às civis). */
export function financialMonthsEndingAt(key: MonthKey, count: number): MonthKey[] {
  return monthsEndingAt(key, count);
}

function dayNumber(date: CalendarDate): number {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
}

/** Número de dias do período financeiro. */
export function daysInFinancialMonth(key: MonthKey, startDay: FinancialMonthStartDay = 1): number {
  const { start, end } = financialMonthRange(key, startDay);
  return dayNumber(end) - dayNumber(start) + 1;
}

/** Dia (1 = primeiro) de `date` dentro do seu período financeiro. */
export function dayOfFinancialMonth(
  date: CalendarDate,
  startDay: FinancialMonthStartDay = 1,
): number {
  const { start } = financialMonthRange(financialMonthOf(date, startDay), startDay);
  return dayNumber(date) - dayNumber(start) + 1;
}

/**
 * Totais por dia agrupados por período financeiro, com a forma dos agregados mensais
 * (`month`, `currency`, `type`, `categoryId`, `amount`). Soma por moeda: uma moeda nunca entra
 * no total de outra. Cada dia entra num só período.
 */
export function bucketDailyTotals(
  rows: readonly DatedTotal[],
  startDay: FinancialMonthStartDay = 1,
): {
  month: MonthKey;
  currency: string;
  type: 'income' | 'expense';
  categoryId: Id;
  amount: number;
}[] {
  const totals = new Map<
    string,
    {
      month: MonthKey;
      currency: string;
      type: 'income' | 'expense';
      categoryId: Id;
      amount: number;
    }
  >();
  for (const row of rows) {
    const month = financialMonthOf(row.date, startDay);
    const key = `${month}|${row.currency}|${row.type}|${row.categoryId ?? ''}`;
    const current = totals.get(key);
    if (current) current.amount += row.amount;
    else
      totals.set(key, {
        month,
        currency: row.currency,
        type: row.type,
        // Como nos agregados mensais: sem categoria fica null (o tipo diz Id por herança).
        categoryId: row.categoryId as Id,
        amount: row.amount,
      });
  }
  return [...totals.values()].sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
}
