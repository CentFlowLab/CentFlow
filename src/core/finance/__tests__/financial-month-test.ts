import {
  addDays,
  addMonths,
  bucketDailyTotals,
  dayOfFinancialMonth,
  daysInFinancialMonth,
  financialMonthOf,
  financialMonthRange,
  monthOf,
  monthRange,
  type CalendarDate,
} from '..';

const datesBetween = (from: CalendarDate, to: CalendarDate): CalendarDate[] => {
  const out: CalendarDate[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) out.push(day);
  return out;
};

describe('financial month', () => {
  it('is the calendar month when it starts on day 1', () => {
    for (const day of datesBetween('2023-01-01', '2024-12-31')) {
      expect(financialMonthOf(day, 1)).toBe(monthOf(day));
    }
    for (let key = '2023-01'; key <= '2024-12'; key = addMonths(key, 1)) {
      expect(financialMonthRange(key, 1)).toEqual(monthRange(key));
    }
    expect(financialMonthRange('2024-02', 1)).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  });

  it('has contiguous periods and puts every day in exactly one, for every start day', () => {
    for (let startDay = 1; startDay <= 31; startDay += 1) {
      for (let key = '2023-01'; key <= '2025-12'; key = addMonths(key, 1)) {
        const { start, end } = financialMonthRange(key, startDay);
        const next = financialMonthRange(addMonths(key, 1), startDay);
        expect(addDays(end, 1)).toBe(next.start);
        expect(start <= end).toBe(true);
        expect(financialMonthOf(start, startDay)).toBe(key);
        expect(financialMonthOf(end, startDay)).toBe(key);
      }
    }
  });

  it('names the period after the month with more of its days', () => {
    expect(financialMonthOf('2026-11-13', 25)).toBe('2026-11');
    expect(financialMonthRange('2026-11', 25)).toEqual({ start: '2026-10-25', end: '2026-11-24' });
    expect(financialMonthOf('2026-11-24', 25)).toBe('2026-11');
    expect(financialMonthOf('2026-11-25', 25)).toBe('2026-12');
    expect(financialMonthOf('2026-11-13', 5)).toBe('2026-11');
    expect(financialMonthRange('2026-11', 5)).toEqual({ start: '2026-11-05', end: '2026-12-04' });
    expect(financialMonthOf('2026-11-03', 5)).toBe('2026-10');
    // Início 16: o nome é o do mês em que termina.
    expect(financialMonthRange('2026-11', 16)).toEqual({ start: '2026-10-16', end: '2026-11-15' });
  });

  it('starts on the last day of shorter months', () => {
    expect(financialMonthRange('2026-03', 31)).toEqual({ start: '2026-02-28', end: '2026-03-30' });
    expect(financialMonthRange('2024-03', 31)).toEqual({ start: '2024-02-29', end: '2024-03-30' });
    expect(financialMonthRange('2026-02', 31)).toEqual({ start: '2026-01-31', end: '2026-02-27' });
    expect(financialMonthRange('2026-03', 30)).toEqual({ start: '2026-02-28', end: '2026-03-29' });
  });

  it('crosses the year and stays inside the supported years', () => {
    expect(financialMonthRange('2027-01', 25)).toEqual({ start: '2026-12-25', end: '2027-01-24' });
    expect(financialMonthOf('2026-12-31', 25)).toBe('2027-01');
    expect(financialMonthRange('1900-01', 25).start).toBe('1900-01-01');
    expect(financialMonthRange('2100-12', 5).end).toBe('2100-12-31');
  });

  it('counts the days of the period and the day inside it', () => {
    expect(daysInFinancialMonth('2026-11', 25)).toBe(31);
    expect(dayOfFinancialMonth('2026-10-25', 25)).toBe(1);
    expect(dayOfFinancialMonth('2026-11-13', 25)).toBe(20);
    expect(daysInFinancialMonth('2026-02', 1)).toBe(28);
  });

  it('buckets daily totals by period without mixing currencies or losing amounts', () => {
    const rows = [
      {
        date: '2026-10-24',
        currency: 'EUR',
        type: 'expense' as const,
        categoryId: 'food',
        amount: 1000,
      },
      {
        date: '2026-10-25',
        currency: 'EUR',
        type: 'expense' as const,
        categoryId: 'food',
        amount: 2000,
      },
      {
        date: '2026-11-24',
        currency: 'EUR',
        type: 'expense' as const,
        categoryId: 'food',
        amount: 3000,
      },
      {
        date: '2026-11-24',
        currency: 'USD',
        type: 'expense' as const,
        categoryId: 'food',
        amount: 500,
      },
      {
        date: '2026-11-25',
        currency: 'EUR',
        type: 'income' as const,
        categoryId: null,
        amount: 9000,
      },
    ];
    const buckets = bucketDailyTotals(rows, 25);
    const find = (month: string, currency: string, type: string) =>
      buckets.find((row) => row.month === month && row.currency === currency && row.type === type);
    expect(find('2026-10', 'EUR', 'expense')?.amount).toBe(1000);
    expect(find('2026-11', 'EUR', 'expense')?.amount).toBe(5000);
    expect(find('2026-11', 'USD', 'expense')?.amount).toBe(500);
    expect(find('2026-12', 'EUR', 'income')?.amount).toBe(9000);
    const total = (list: { amount: number }[]) => list.reduce((sum, row) => sum + row.amount, 0);
    expect(total(buckets)).toBe(total(rows));
  });
});
