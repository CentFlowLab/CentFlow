import {
  budgetWindow,
  daySlices,
  monthSlices,
  shiftReference,
  spentAmount,
  weekSlices,
  type BudgetCandidate,
  type BudgetWindow,
} from './budgets';
import { addDays, addMonths, monthOf, monthRange, type CalendarDate } from './dates';
import { remainingAmountMinor } from './goals';
import { summarize, type PeriodSummary } from './summary';
import type { BudgetPeriod, Id } from './types';
import { financialMonthOf, financialMonthRange } from './financial-month';

export type ReportPreset = 'month' | 'quarter' | 'year' | 'custom';

export type InclusiveRange = { from: CalendarDate; to: CalendarDate };

/** Totais já agregados por dia, moeda, tipo e categoria. As transferências não entram. */
export type DatedTotal = {
  date: CalendarDate;
  currency: string;
  type: 'income' | 'expense';
  categoryId: Id | null;
  amount: number;
};

export type CategoryTotal = {
  categoryId: Id | null;
  amount: number;
  share: number;
};

export type EvolutionPoint = {
  key: string;
  start: CalendarDate;
  end: CalendarDate;
  income: number;
  expense: number;
};

export type CurrencyReport = {
  currency: string;
  summary: PeriodSummary;
  previous: PeriodSummary;
  categories: CategoryTotal[];
  evolution: EvolutionPoint[];
};

export type BudgetStanding = {
  id: Id;
  categoryId: Id;
  currency: string;
  spent: number;
  limit: number;
  windows: number;
  status: 'met' | 'over';
};

/** Conta dias de calendário. Não serve para decidir o dia de um movimento. */
function calendarDayNumber(value: CalendarDate): number {
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function quarterContaining(date: CalendarDate): InclusiveRange {
  const month = Number(date.slice(5, 7));
  const startMonth = Math.floor((month - 1) / 3) * 3 + 1;
  const startKey = `${date.slice(0, 4)}-${String(startMonth).padStart(2, '0')}`;
  const endKey = addMonths(startKey, 2);
  return { from: monthRange(startKey).start, to: monthRange(endKey).end };
}

function previousQuarter(current: InclusiveRange): InclusiveRange {
  const startKey = addMonths(monthOf(current.from), -3);
  const endKey = addMonths(startKey, 2);
  return { from: monthRange(startKey).start, to: monthRange(endKey).end };
}

function yearContaining(date: CalendarDate): InclusiveRange {
  const year = date.slice(0, 4);
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

function previousYear(current: InclusiveRange): InclusiveRange {
  const year = String(Number(current.from.slice(0, 4)) - 1).padStart(4, '0');
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

function previousSameLength(current: InclusiveRange): InclusiveRange {
  const span = calendarDayNumber(current.to) - calendarDayNumber(current.from);
  const to = addDays(current.from, -1);
  return { from: addDays(to, -span), to };
}

/**
 * Período pedido e o período anterior da mesma duração.
 * Um intervalo personalizado inválido (fim antes do início) não produz números.
 */
export function reportRanges(
  preset: ReportPreset,
  today: CalendarDate,
  custom?: InclusiveRange,
  startDay = 1,
): { current: InclusiveRange; previous: InclusiveRange } | null {
  if (preset === 'custom') {
    if (!custom || custom.from > custom.to) return null;
    return { current: custom, previous: previousSameLength(custom) };
  }
  if (preset === 'month') {
    // O período financeiro atual e o anterior (ADR-077); trimestre e ano continuam civis.
    const key = financialMonthOf(today, startDay);
    const current = financialMonthRange(key, startDay);
    const previous = financialMonthRange(addMonths(key, -1), startDay);
    return {
      current: { from: current.start, to: current.end },
      previous: { from: previous.start, to: previous.end },
    };
  }
  if (preset === 'quarter') {
    const current = quarterContaining(today);
    return { current, previous: previousQuarter(current) };
  }
  const current = yearContaining(today);
  return { current, previous: previousYear(current) };
}

function inRange(date: CalendarDate, range: InclusiveRange): boolean {
  return date >= range.from && date <= range.to;
}

function summaryOf(
  rows: readonly DatedTotal[],
  currency: string,
  range: InclusiveRange,
): PeriodSummary {
  return summarize(
    rows
      .filter((row) => row.currency === currency && inRange(row.date, range))
      .map((row) => ({
        type: row.type,
        amount: row.amount,
        categoryId: row.categoryId,
        date: row.date,
      })),
  );
}

function categoriesOf(
  rows: readonly DatedTotal[],
  currency: string,
  range: InclusiveRange,
): CategoryTotal[] {
  const totals = new Map<string, { categoryId: Id | null; amount: number }>();
  let total = 0;
  for (const row of rows) {
    if (row.currency !== currency || row.type !== 'expense' || !inRange(row.date, range)) continue;
    const key = row.categoryId ?? '';
    const current = totals.get(key) ?? { categoryId: row.categoryId, amount: 0 };
    current.amount += row.amount;
    totals.set(key, current);
    total += row.amount;
  }
  return [...totals.values()]
    .map((item) => ({
      categoryId: item.categoryId,
      amount: item.amount,
      share: total > 0 ? item.amount / total : 0,
    }))
    .sort(
      (left, right) =>
        right.amount - left.amount || (left.categoryId ?? '').localeCompare(right.categoryId ?? ''),
    );
}

/** Até duas semanas: dias. Até cerca de um trimestre: semanas. Depois: meses. */
export function evolutionSlices(
  range: InclusiveRange,
): { key: string; start: CalendarDate; end: CalendarDate }[] {
  const days = calendarDayNumber(range.to) - calendarDayNumber(range.from) + 1;
  if (days <= 14) return daySlices(range.from, range.to);
  if (days <= 120) return weekSlices(range.from, range.to);
  return monthSlices(range.from, range.to);
}

function evolutionOf(
  rows: readonly DatedTotal[],
  currency: string,
  range: InclusiveRange,
): EvolutionPoint[] {
  return evolutionSlices(range).map((slice) => {
    let income = 0;
    let expense = 0;
    for (const row of rows) {
      if (row.currency !== currency || row.date < slice.start || row.date > slice.end) continue;
      if (row.type === 'income') income += row.amount;
      else expense += row.amount;
    }
    return { key: slice.key, start: slice.start, end: slice.end, income, expense };
  });
}

/** Resumo, comparação, categorias e evolução de uma só moeda. */
export function buildCurrencyReport(
  rows: readonly DatedTotal[],
  currency: string,
  current: InclusiveRange,
  previous: InclusiveRange,
): CurrencyReport {
  return {
    currency,
    summary: summaryOf(rows, currency, current),
    previous: summaryOf(rows, currency, previous),
    categories: categoriesOf(rows, currency, current),
    evolution: evolutionOf(rows, currency, current),
  };
}

function windowsOverlapping(
  period: BudgetPeriod,
  startsOn: CalendarDate,
  range: InclusiveRange,
): BudgetWindow[] {
  const found: BudgetWindow[] = [];
  let cursor = range.from;
  for (let guard = 0; cursor <= range.to && guard < 400; guard += 1) {
    const window = budgetWindow(period, cursor, startsOn);
    if (window && window.end >= range.from && window.start <= range.to) {
      const last = found[found.length - 1];
      if (!last || last.start !== window.start || last.end !== window.end) found.push(window);
    }
    const next = shiftReference(period, cursor, 1);
    if (next <= cursor) break;
    cursor = next;
  }
  return found;
}

type ReportBudget = {
  id: Id;
  categoryId: Id;
  currency: string;
  period: BudgetPeriod;
  startsOn: CalendarDate;
  amount: number;
};

/**
 * Cada janela do orçamento que cruza o período conta o respetivo limite.
 * O gasto é só despesa dessa categoria e moeda, dentro do período e da janela.
 */
export function budgetsForPeriod(
  budgets: readonly ReportBudget[],
  lines: readonly BudgetCandidate[],
  range: InclusiveRange,
): BudgetStanding[] {
  const standings: BudgetStanding[] = [];
  for (const budget of budgets) {
    const windows = windowsOverlapping(budget.period, budget.startsOn, range);
    if (windows.length === 0) continue;
    let spent = 0;
    for (const window of windows) {
      const clipped = {
        start: window.start > range.from ? window.start : range.from,
        end: window.end < range.to ? window.end : range.to,
      };
      spent += spentAmount(lines, budget, clipped);
    }
    const limit = budget.amount * windows.length;
    standings.push({
      id: budget.id,
      categoryId: budget.categoryId,
      currency: budget.currency,
      spent,
      limit,
      windows: windows.length,
      status: spent > limit ? 'over' : 'met',
    });
  }
  return standings.sort(
    (left, right) => right.spent - left.spent || left.categoryId.localeCompare(right.categoryId),
  );
}

export function goalStanding(
  targetMinor: number,
  savedMinor: number,
): {
  saved: number;
  remaining: number;
  /** Fração do alvo, sem ultrapassar 1 na barra. O valor junto pode ser maior. */
  ratio: number;
} {
  return {
    saved: savedMinor,
    remaining: remainingAmountMinor(targetMinor, savedMinor),
    ratio: targetMinor > 0 ? Math.min(1, savedMinor / targetMinor) : 0,
  };
}
