import {
  addDays,
  addMonths,
  isValidCalendarDate,
  isValidMonthKey,
  monthOf,
  monthRange,
  monthsEndingAt,
  presetRange,
  toCalendarDate,
} from '..';

describe('presetRange', () => {
  const today = '2026-01-15';

  it.each([
    ['all', {}],
    ['thisMonth', { start: '2026-01-01', end: '2026-01-31' }],
    ['lastMonth', { start: '2025-12-01', end: '2025-12-31' }],
    ['last3Months', { from: '2025-11-01', to: '2026-01-31' }],
    ['thisYear', { from: '2026-01-01', to: '2026-12-31' }],
  ] as const)('%s', (preset, expected) => {
    const range = presetRange(preset, today);
    if ('start' in expected) expect(range).toEqual({ from: expected.start, to: expected.end });
    else expect(range).toEqual(expected);
  });
});

describe('calendar dates', () => {
  it.each(['2026-01-31', '2024-02-29', '2026-12-01', '1900-01-01', '2100-12-31'])(
    'accepts %s',
    (value) => expect(isValidCalendarDate(value)).toBe(true),
  );

  it.each([
    '2026-02-29',
    '2026-13-01',
    '2026-00-10',
    '2026-04-31',
    '26-01-01',
    '2026-1-1',
    '',
    '1899-12-31',
    '2101-01-01',
    '2026-01-01T00:00',
  ])('rejects %s', (value) => expect(isValidCalendarDate(value)).toBe(false));

  it('uses the local calendar day, not UTC', () => {
    expect(toCalendarDate(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
    expect(toCalendarDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-03-31', 1)).toBe('2026-04-01');
  });
});

describe('months', () => {
  it('validates month keys', () => {
    expect(isValidMonthKey('2026-11')).toBe(true);
    expect(isValidMonthKey('2026-13')).toBe(false);
  });

  it('derives the month of a date', () => {
    expect(monthOf('2026-11-08')).toBe('2026-11');
  });

  it('navigates months across years', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-05', -17)).toBe('2024-12');
    expect(addMonths('2026-05', 0)).toBe('2026-05');
  });

  it('computes inclusive month ranges', () => {
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(monthRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });

  it('lists consecutive months ending at a month', () => {
    expect(monthsEndingAt('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
});
