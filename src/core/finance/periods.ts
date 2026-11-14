import { addMonths, type CalendarDate } from './dates';
import { financialMonthOf, financialMonthRange } from './financial-month';

export const PERIOD_PRESETS = ['all', 'thisMonth', 'lastMonth', 'last3Months', 'thisYear'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export type DateRange = { from?: CalendarDate; to?: CalendarDate };

/**
 * Intervalo (inclusive) de um período predefinido, relativo a `today`. Os meses são períodos
 * financeiros (ADR-077): com `startDay` 1, os meses civis de sempre.
 */
export function presetRange(preset: PeriodPreset, today: CalendarDate, startDay = 1): DateRange {
  const month = financialMonthOf(today, startDay);
  const wholeMonth = (key: string): DateRange => {
    const { start, end } = financialMonthRange(key, startDay);
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
      return {
        from: financialMonthRange(addMonths(month, -2), startDay).start,
        to: financialMonthRange(month, startDay).end,
      };
    case 'thisYear':
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
  }
}
