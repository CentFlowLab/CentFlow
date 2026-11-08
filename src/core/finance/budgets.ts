import {
  addDays,
  addMonths,
  calendarDateToLocalDate,
  monthOf,
  monthRange,
  type CalendarDate,
  type MonthKey,
} from './dates';
import type { BudgetPeriod, EntryType, Id } from './types';

/** A partir daqui o limite pede atenção, está perto, ou foi ultrapassado. */
export const BUDGET_THRESHOLDS = { watch: 0.75, near: 0.9, over: 1 } as const;

export type BudgetLevel = 'ok' | 'watch' | 'near' | 'over';

export type BudgetWindow = { start: CalendarDate; end: CalendarDate };

/**
 * Movimento candidato a consumo de orçamento. Só `expense` conta:
 * um rendimento (incluindo um reembolso registado como rendimento) e uma
 * transferência não são despesas.
 */
export type BudgetCandidate = {
  type: EntryType;
  categoryId: Id | null;
  currency: string;
  date: CalendarDate;
  amount: number;
};

export type BudgetFigures = {
  spent: number;
  limit: number;
  /** Negativo quando o limite foi ultrapassado. */
  available: number;
  /** `spent / limit`. Pode ser maior que 1. Zero quando não há limite. */
  ratio: number;
  level: BudgetLevel;
};

export type SpendSlice = { key: string; start: CalendarDate; end: CalendarDate };

type BudgetScope = {
  categoryId: Id;
  currency: string;
  period: BudgetPeriod;
  startsOn: CalendarDate;
  amount: number;
};

export function budgetLevel(ratio: number): BudgetLevel {
  if (ratio >= BUDGET_THRESHOLDS.over) return 'over';
  if (ratio >= BUDGET_THRESHOLDS.near) return 'near';
  if (ratio >= BUDGET_THRESHOLDS.watch) return 'watch';
  return 'ok';
}

export function budgetFigures(spent: number, limit: number): BudgetFigures {
  const ratio = limit > 0 ? spent / limit : 0;
  return {
    spent,
    limit,
    available: limit - spent,
    ratio,
    level: limit > 0 ? budgetLevel(ratio) : 'ok',
  };
}

/** Segunda-feira da semana local que contém `date` (Portugal: a semana começa à segunda). */
export function startOfWeek(date: CalendarDate): CalendarDate {
  const weekday = calendarDateToLocalDate(date).getDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return addDays(date, delta);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function clampDay(month: MonthKey, day: number): CalendarDate {
  const last = Number(monthRange(month).end.slice(8));
  return `${month}-${pad(Math.min(day, last))}`;
}

/** O mesmo ponto do período anterior ou seguinte, sem usar o relógio UTC para escolher o dia. */
export function shiftReference(
  period: BudgetPeriod,
  reference: CalendarDate,
  delta: -1 | 1,
): CalendarDate {
  if (period === 'weekly') return addDays(reference, delta * 7);
  if (period === 'yearly') {
    const year = Number(reference.slice(0, 4)) + delta;
    return clampDay(
      `${String(year).padStart(4, '0')}-${reference.slice(5, 7)}`,
      Number(reference.slice(8)),
    );
  }
  return clampDay(addMonths(monthOf(reference), delta), Number(reference.slice(8)));
}

function unclipped(period: BudgetPeriod, reference: CalendarDate): BudgetWindow {
  if (period === 'monthly') return monthRange(monthOf(reference));
  if (period === 'yearly') {
    const year = reference.slice(0, 4);
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  const start = startOfWeek(reference);
  return { start, end: addDays(start, 6) };
}

/**
 * Janela em que o orçamento está ativo na data de referência.
 * `null` quando o período termina antes de `startsOn`.
 */
export function budgetWindow(
  period: BudgetPeriod,
  reference: CalendarDate,
  startsOn: CalendarDate,
): BudgetWindow | null {
  const range = unclipped(period, reference);
  if (startsOn > range.end) return null;
  return { start: startsOn > range.start ? startsOn : range.start, end: range.end };
}

/** Dia usado para ler orçamentos de um mês: hoje, ou o último dia se o mês já passou ou ainda não chegou. */
export function referenceForMonth(month: MonthKey, today: CalendarDate): CalendarDate {
  if (monthOf(today) === month) return today;
  return monthRange(month).end;
}

export function spentAmount(
  lines: readonly BudgetCandidate[],
  scope: Pick<BudgetScope, 'categoryId' | 'currency'>,
  window: BudgetWindow,
): number {
  let spent = 0;
  for (const line of lines) {
    if (line.type !== 'expense') continue;
    if (line.categoryId !== scope.categoryId || line.currency !== scope.currency) continue;
    if (line.date < window.start || line.date > window.end) continue;
    spent += line.amount;
  }
  return spent;
}

export function assessBudget(
  budget: BudgetScope,
  lines: readonly BudgetCandidate[],
  reference: CalendarDate,
): {
  window: BudgetWindow | null;
  figures: BudgetFigures;
  /** Só quando o período anterior teve despesa. Sem dados, não há comparação. */
  previous: BudgetFigures | null;
} {
  const window = budgetWindow(budget.period, reference, budget.startsOn);
  const figures = budgetFigures(window ? spentAmount(lines, budget, window) : 0, budget.amount);
  const previousWindow = budgetWindow(
    budget.period,
    shiftReference(budget.period, reference, -1),
    budget.startsOn,
  );
  if (!previousWindow) return { window, figures, previous: null };
  const previousSpent = spentAmount(lines, budget, previousWindow);
  if (previousSpent <= 0) return { window, figures, previous: null };
  return { window, figures, previous: budgetFigures(previousSpent, budget.amount) };
}

export function daySlices(start: CalendarDate, end: CalendarDate): SpendSlice[] {
  const slices: SpendSlice[] = [];
  let cursor = start;
  while (cursor <= end) {
    slices.push({ key: cursor, start: cursor, end: cursor });
    cursor = addDays(cursor, 1);
  }
  return slices;
}

export function weekSlices(start: CalendarDate, end: CalendarDate): SpendSlice[] {
  const slices: SpendSlice[] = [];
  let cursor = start;
  while (cursor <= end) {
    const weekEnd = addDays(startOfWeek(cursor), 6);
    const sliceEnd = weekEnd < end ? weekEnd : end;
    slices.push({ key: cursor, start: cursor, end: sliceEnd });
    cursor = addDays(sliceEnd, 1);
  }
  return slices;
}

export function monthSlices(start: CalendarDate, end: CalendarDate): SpendSlice[] {
  const slices: SpendSlice[] = [];
  let month = monthOf(start);
  const last = monthOf(end);
  while (month <= last) {
    const range = monthRange(month);
    slices.push({
      key: month,
      start: range.start < start ? start : range.start,
      end: range.end > end ? end : range.end,
    });
    month = addMonths(month, 1);
  }
  return slices;
}

/** Semanal: dias. Mensal: semanas. Anual: meses. */
export function detailSlices(window: BudgetWindow, period: BudgetPeriod): SpendSlice[] {
  if (period === 'weekly') return daySlices(window.start, window.end);
  if (period === 'yearly') return monthSlices(window.start, window.end);
  return weekSlices(window.start, window.end);
}

/**
 * Soma, por fatia, as despesas que consomem algum orçamento desta moeda na data de referência.
 * Uma categoria só pode ter um orçamento ativo, por isso a despesa não é somada duas vezes.
 */
export function spendBySlice(
  lines: readonly BudgetCandidate[],
  budgets: readonly BudgetScope[],
  slices: readonly SpendSlice[],
  currency: string,
  reference: CalendarDate,
): number[] {
  const windows = budgets
    .filter((budget) => budget.currency === currency)
    .map((budget) => ({
      categoryId: budget.categoryId,
      window: budgetWindow(budget.period, reference, budget.startsOn),
    }))
    .filter((item): item is { categoryId: Id; window: BudgetWindow } => item.window !== null);

  return slices.map((slice) => {
    let total = 0;
    for (const line of lines) {
      if (line.type !== 'expense' || line.currency !== currency) continue;
      if (line.date < slice.start || line.date > slice.end) continue;
      const matches = windows.some(
        (item) =>
          item.categoryId === line.categoryId &&
          line.date >= item.window.start &&
          line.date <= item.window.end,
      );
      if (matches) total += line.amount;
    }
    return total;
  });
}
