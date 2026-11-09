import type { CalendarDate } from './dates';

/** Diferença em dias entre duas datas de calendário (sem usar o fuso do dispositivo). */
function daysBetween(from: CalendarDate, to: CalendarDate): number {
  const ms = (value: CalendarDate) => {
    const [year, month, day] = value.split('-').map(Number) as [number, number, number];
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((ms(to) - ms(from)) / 86_400_000);
}

export type DeadlineStatus = 'overdue' | 'soon' | 'ok' | 'none';

/** Dias de antecedência a partir dos quais um prazo passa a "em breve". */
export const DEADLINE_SOON_DAYS = 30;

export function deadlineStatus(
  date: CalendarDate | null,
  today: CalendarDate,
  soonDays: number = DEADLINE_SOON_DAYS,
): DeadlineStatus {
  if (date === null) return 'none';
  const days = daysBetween(today, date);
  if (days < 0) return 'overdue';
  return days <= soonDays ? 'soon' : 'ok';
}

/** Dias até ao prazo (negativo se já passou); `null` sem data. */
export function daysUntil(date: CalendarDate | null, today: CalendarDate): number | null {
  return date === null ? null : daysBetween(today, date);
}
