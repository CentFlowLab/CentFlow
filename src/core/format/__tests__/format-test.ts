import { formatDate, formatPercent, getDayPart } from '..';

describe('getDayPart', () => {
  const at = (hour: number) => new Date(2026, 0, 15, hour, 0, 0);

  it.each([
    [5, 'evening'],
    [6, 'morning'],
    [12, 'morning'],
    [13, 'afternoon'],
    [19, 'afternoon'],
    [20, 'evening'],
  ] as const)('at %i:00 returns %s', (hour, expected) => {
    expect(getDayPart(at(hour))).toBe(expected);
  });
});

describe('formatDate', () => {
  it('uses the locale date order', () => {
    const date = new Date(2026, 2, 9);
    expect(formatDate(date, 'pt-PT', 'short')).toBe('09/03/2026');
    expect(formatDate(date, 'en-US', 'short')).toBe('03/09/2026');
  });
});

describe('formatPercent', () => {
  it('formats ratios as percentages', () => {
    expect(formatPercent(0.256, 'en-GB')).toBe('26%');
    expect(formatPercent(0.256, 'en-GB', 1)).toBe('25.6%');
  });
});
