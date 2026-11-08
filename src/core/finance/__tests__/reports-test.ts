import {
  budgetsForPeriod,
  buildCurrencyReport,
  goalStanding,
  reportRanges,
  type DatedTotal,
} from '../reports';

const EUR_INCOME: DatedTotal = {
  date: '2026-11-02',
  currency: 'EUR',
  type: 'income',
  categoryId: 'salary',
  amount: 10000,
};
const EUR_FOOD: DatedTotal = {
  date: '2026-11-08',
  currency: 'EUR',
  type: 'expense',
  categoryId: 'food',
  amount: 4000,
};
const EUR_OTHER: DatedTotal = {
  date: '2026-11-09',
  currency: 'EUR',
  type: 'expense',
  categoryId: null,
  amount: 1000,
};
const USD_FOOD: DatedTotal = {
  date: '2026-11-08',
  currency: 'USD',
  type: 'expense',
  categoryId: 'food',
  amount: 9999,
};
const PREVIOUS: DatedTotal = {
  date: '2026-10-15',
  currency: 'EUR',
  type: 'income',
  categoryId: 'salary',
  amount: 2000,
};

describe('report periods', () => {
  it('uses the calendar month and the previous month', () => {
    expect(reportRanges('month', '2026-11-08')).toEqual({
      current: { from: '2026-11-01', to: '2026-11-30' },
      previous: { from: '2026-10-01', to: '2026-10-31' },
    });
  });

  it('uses the calendar quarter and the previous quarter', () => {
    expect(reportRanges('quarter', '2026-11-08')).toEqual({
      current: { from: '2026-10-01', to: '2026-12-31' },
      previous: { from: '2026-07-01', to: '2026-09-30' },
    });
    expect(reportRanges('quarter', '2026-01-15')?.previous).toEqual({
      from: '2025-10-01',
      to: '2025-12-31',
    });
  });

  it('uses the calendar year and the previous year', () => {
    expect(reportRanges('year', '2026-11-08')).toEqual({
      current: { from: '2026-01-01', to: '2026-12-31' },
      previous: { from: '2025-01-01', to: '2025-12-31' },
    });
  });

  it('repeats a custom interval of the same length immediately before', () => {
    expect(reportRanges('custom', '2026-11-08', { from: '2026-03-10', to: '2026-03-12' })).toEqual({
      current: { from: '2026-03-10', to: '2026-03-12' },
      previous: { from: '2026-03-07', to: '2026-03-09' },
    });
    expect(
      reportRanges('custom', '2026-11-08', { from: '2026-03-12', to: '2026-03-10' }),
    ).toBeNull();
  });
});

describe('currency report', () => {
  const ranges = reportRanges('month', '2026-11-08');
  if (!ranges) throw new Error('período em falta');
  const rows = [EUR_INCOME, EUR_FOOD, EUR_OTHER, USD_FOOD, PREVIOUS];

  it('does not add another currency into the totals', () => {
    const report = buildCurrencyReport(rows, 'EUR', ranges.current, ranges.previous);
    expect(report.summary).toEqual({ income: 10000, expense: 5000, net: 5000, savingsRate: 0.5 });
    expect(report.previous).toEqual({ income: 2000, expense: 0, net: 2000, savingsRate: 1 });
    expect(buildCurrencyReport(rows, 'USD', ranges.current, ranges.previous).summary.expense).toBe(
      9999,
    );
  });

  it('keeps uncategorized expenses in the share of the total', () => {
    const report = buildCurrencyReport(rows, 'EUR', ranges.current, ranges.previous);
    expect(report.categories).toEqual([
      { categoryId: 'food', amount: 4000, share: 0.8 },
      { categoryId: null, amount: 1000, share: 0.2 },
    ]);
  });

  it('splits the month into weeks without mixing currencies', () => {
    const report = buildCurrencyReport(rows, 'EUR', ranges.current, ranges.previous);
    const spent = report.evolution.reduce((sum, point) => sum + point.expense, 0);
    expect(spent).toBe(5000);
    expect(report.evolution.length).toBeGreaterThan(1);
    expect(report.evolution.every((point) => point.income === 0 || point.income === 10000)).toBe(
      true,
    );
  });
});

describe('budgets and goals in a report', () => {
  it('marks a budget met or over only for its currency and category', () => {
    const budget = {
      id: 'budget',
      categoryId: 'food',
      currency: 'EUR',
      period: 'monthly' as const,
      startsOn: '2026-01-01',
      amount: 5000,
    };
    const range = { from: '2026-11-01', to: '2026-11-30' };
    const over = budgetsForPeriod(
      [budget],
      [
        { type: 'expense', categoryId: 'food', currency: 'EUR', date: '2026-11-08', amount: 6000 },
        { type: 'expense', categoryId: 'food', currency: 'USD', date: '2026-11-08', amount: 1 },
        { type: 'income', categoryId: 'food', currency: 'EUR', date: '2026-11-08', amount: 9000 },
      ],
      range,
    );
    expect(over).toEqual([
      {
        id: 'budget',
        categoryId: 'food',
        currency: 'EUR',
        spent: 6000,
        limit: 5000,
        windows: 1,
        status: 'over',
      },
    ]);
    expect(
      budgetsForPeriod(
        [budget],
        [
          {
            type: 'expense',
            categoryId: 'food',
            currency: 'EUR',
            date: '2026-11-08',
            amount: 1000,
          },
        ],
        range,
      )[0]?.status,
    ).toBe('met');
  });

  it('ignores a budget that has not started in the period', () => {
    expect(
      budgetsForPeriod(
        [
          {
            id: 'later',
            categoryId: 'food',
            currency: 'EUR',
            period: 'monthly',
            startsOn: '2026-12-01',
            amount: 100,
          },
        ],
        [{ type: 'expense', categoryId: 'food', currency: 'EUR', date: '2026-11-08', amount: 100 }],
        { from: '2026-11-01', to: '2026-11-30' },
      ),
    ).toEqual([]);
  });

  it('caps the progress bar at the target and keeps the real saved amount', () => {
    expect(goalStanding(10000, 2500)).toEqual({ saved: 2500, remaining: 7500, ratio: 0.25 });
    expect(goalStanding(10000, 12000)).toEqual({ saved: 12000, remaining: 0, ratio: 1 });
  });
});
