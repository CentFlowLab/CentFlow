export type DateStyle = 'short' | 'medium' | 'long';

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: '2-digit', month: '2-digit', year: 'numeric' },
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
};

export function formatDate(date: Date, locale: string, style: DateStyle = 'medium'): string {
  return new Intl.DateTimeFormat(locale, DATE_OPTIONS[style]).format(date);
}

export function formatDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatMonthYear(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

export type DayPart = 'morning' | 'afternoon' | 'evening';

export function getDayPart(date: Date): DayPart {
  const hour = date.getHours();
  if (hour >= 6 && hour < 13) return 'morning';
  if (hour >= 13 && hour < 20) return 'afternoon';
  return 'evening';
}
