export type CalendarDayCell = {
  date: Date;
  inCurrentMonth: boolean;
};

const WEEKDAY_LABELS_PT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

export function getWeekdayLabels(): readonly string[] {
  return WEEKDAY_LABELS_PT;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isBeforeDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

export function isAfterDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() > startOfDay(b).getTime();
}

export function isDateDisabled(
  date: Date,
  minimumDate?: Date,
  maximumDate?: Date,
): boolean {
  if (minimumDate && isBeforeDay(date, minimumDate)) return true;
  if (maximumDate && isAfterDay(date, maximumDate)) return true;
  return false;
}

/** Grelha de 6 semanas (42 células), semana começa segunda-feira. */
export function buildMonthGrid(year: number, month: number): CalendarDayCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const weekday = firstOfMonth.getDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  const gridStart = new Date(year, month, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      inCurrentMonth: date.getMonth() === month,
    };
  });
}

export function formatMonthYear(date: Date, locale = 'pt-PT'): string {
  const formatted = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}
