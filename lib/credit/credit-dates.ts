import { toIsoDateString } from '@/lib/utils/format';

/** Maior dia válido de um mês (ex.: Fevereiro → 28/29). */
function clampDayToMonth(year: number, monthIndex: number, day: number): number {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(Math.round(day), 1), lastDay);
}

/** Primeiro dia do mês seguinte (YYYY-MM-DD). */
export function firstDayOfNextMonthIso(from: Date = new Date()): string {
  return toIsoDateString(new Date(from.getFullYear(), from.getMonth() + 1, 1));
}

/**
 * Próxima ocorrência de um dia do mês (1–31) a partir de `from`.
 * Se o dia ainda não passou neste mês, usa este mês; caso contrário, o próximo.
 */
export function nextOccurrenceOfDayIso(day: number, from: Date = new Date()): string {
  const year = from.getFullYear();
  const month = from.getMonth();
  const candidateDay = clampDayToMonth(year, month, day);

  if (candidateDay >= from.getDate()) {
    return toIsoDateString(new Date(year, month, candidateDay));
  }

  const nextMonth = new Date(year, month + 1, 1);
  const ny = nextMonth.getFullYear();
  const nm = nextMonth.getMonth();
  return toIsoDateString(new Date(ny, nm, clampDayToMonth(ny, nm, day)));
}

/** Avança uma data (YYYY-MM-DD) um mês mantendo o mesmo dia (com clamp). */
export function advanceMonthSameDayIso(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return firstDayOfNextMonthIso();
  const targetMonthIndex = month; // month é 1-based; month (1-based) === próximo mês em índice 0-based
  const ny = month === 12 ? year + 1 : year;
  const nm = month === 12 ? 0 : targetMonthIndex;
  return toIsoDateString(new Date(ny, nm, clampDayToMonth(ny, nm, day)));
}

/** Soma `days` dias a uma data e devolve YYYY-MM-DD. */
export function addDaysIso(from: Date, days: number): string {
  return toIsoDateString(new Date(from.getFullYear(), from.getMonth(), from.getDate() + days));
}

/** Verdadeiro se a data (YYYY-MM-DD) é hoje ou já passou. */
export function isDueOrPast(iso: string, today: Date = new Date()): boolean {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return false;
  const due = new Date(year, month - 1, day);
  const midnightToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return due.getTime() <= midnightToday.getTime();
}
