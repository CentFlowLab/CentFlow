import { addMonths, monthOf, monthRange, type CalendarDate } from './dates';

export const PERIOD_PRESETS = ['all', 'thisMonth', 'lastMonth', 'last3Months', 'thisYear'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export type DateRange = { from?: CalendarDate; to?: CalendarDate };

/** Intervalo (inclusive) de um período predefinido, relativo a `today`. */
export function presetRange(preset: PeriodPreset, today: CalendarDate): DateRange {
  const month = monthOf(today);
  const wholeMonth = (key: string): DateRange => {
    const { start, end } = monthRange(key);
    return { from: start, to: end };
  };
  switch (preset) {
    case 'all':
      return {};
    case 'thisMonth':
      return wholeMonth(month);
    case 'lastMonth':
      return wholeMonth(addMonths(month, -1));
    case 'last3Months':
      return { from: monthRange(addMonths(month, -2)).start, to: monthRange(month).end };
    case 'thisYear':
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
  }
}
