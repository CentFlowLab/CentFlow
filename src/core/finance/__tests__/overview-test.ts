import { buildMonthlyOverview, pickPrimaryCurrency, type MonthlyAggregate } from '..';

describe('pickPrimaryCurrency', () => {
  it('uses the most common account currency', () => {
    expect(pickPrimaryCurrency(['USD', 'EUR', 'EUR'])).toBe('EUR');
    expect(pickPrimaryCurrency(['GBP'])).toBe('GBP');
  });

  it('breaks ties by account order', () => {
    expect(pickPrimaryCurrency(['USD', 'EUR'])).toBe('USD');
  });

  it('falls back without accounts', () => {
    expect(pickPrimaryCurrency([])).toBe('EUR');
    expect(pickPrimaryCurrency([], 'USD')).toBe('USD');
  });
});

describe('buildMonthlyOverview', () => {
  const aggregates: MonthlyAggregate[] = [
    { month: '2026-09', currency: 'EUR', type: 'expense', categoryId: 'food', amount: 10000 },
    { month: '2026-11', currency: 'EUR', type: 'income', categoryId: 'salary', amount: 250000 },
    { month: '2026-11', currency: 'EUR', type: 'expense', categoryId: 'food', amount: 30000 },
    { month: '2026-11', currency: 'EUR', type: 'expense', categoryId: 'home', amount: 70000 },
    { month: '2026-11', currency: 'USD', type: 'expense', categoryId: 'food', amount: 99999 },
  ];

  it('summarises the selected month in one currency', () => {
    const overview = buildMonthlyOverview(aggregates, {
      month: '2026-11',
      currency: 'EUR',
      trendLength: 3,
    });
    expect(overview.summary).toEqual({
      income: 250000,
      expense: 100000,
      net: 150000,
      savingsRate: 0.6,
    });
    expect(overview.categories).toEqual([
      { categoryId: 'home', amount: 70000, share: 0.7 },
      { categoryId: 'food', amount: 30000, share: 0.3 },
    ]);
    expect(overview.trend).toEqual([
      { month: '2026-09', income: 0, expense: 10000, net: -10000 },
      { month: '2026-10', income: 0, expense: 0, net: 0 },
      { month: '2026-11', income: 250000, expense: 100000, net: 150000 },
    ]);
  });

  it('is empty for a month without data', () => {
    const overview = buildMonthlyOverview(aggregates, {
      month: '2026-10',
      currency: 'EUR',
      trendLength: 1,
    });
    expect(overview.summary).toEqual({ income: 0, expense: 0, net: 0, savingsRate: null });
    expect(overview.categories).toEqual([]);
  });
});
