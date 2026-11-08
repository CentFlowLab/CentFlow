import { expensesByCategory, monthlyTotals, summarize, type Entry } from '..';

type E = Pick<Entry, 'type' | 'amount' | 'categoryId' | 'date'>;

const entries: E[] = [
  { type: 'income', amount: 200000, categoryId: 'salary', date: '2026-11-01' },
  { type: 'expense', amount: 50000, categoryId: 'home', date: '2026-11-02' },
  { type: 'expense', amount: 25000, categoryId: 'food', date: '2026-11-05' },
  { type: 'expense', amount: 25000, categoryId: 'home', date: '2026-11-20' },
  { type: 'transfer', amount: 99999, categoryId: null, date: '2026-11-21' },
  { type: 'expense', amount: 1000, categoryId: 'food', date: '2026-10-31' },
];

describe('summarize', () => {
  it('computes income, expense, net and savings rate ignoring transfers', () => {
    const november = entries.filter((entry) => entry.date.startsWith('2026-11'));
    expect(summarize(november)).toEqual({
      income: 200000,
      expense: 100000,
      net: 100000,
      savingsRate: 0.5,
    });
  });

  it('returns a null savings rate without income', () => {
    expect(
      summarize([{ type: 'expense', amount: 100, categoryId: 'x', date: '2026-01-01' }]),
    ).toEqual({ income: 0, expense: 100, net: -100, savingsRate: null });
  });

  it('allows negative savings rates', () => {
    expect(
      summarize([
        { type: 'income', amount: 1000, categoryId: 'a', date: '2026-01-01' },
        { type: 'expense', amount: 1500, categoryId: 'b', date: '2026-01-02' },
      ]).savingsRate,
    ).toBe(-0.5);
  });

  it('is zero for an empty period', () => {
    expect(summarize([])).toEqual({ income: 0, expense: 0, net: 0, savingsRate: null });
  });
});

describe('expensesByCategory', () => {
  it('groups expenses by category, sorted by amount, with shares', () => {
    const november = entries.filter((entry) => entry.date.startsWith('2026-11'));
    expect(expensesByCategory(november)).toEqual([
      { categoryId: 'home', amount: 75000, share: 0.75 },
      { categoryId: 'food', amount: 25000, share: 0.25 },
    ]);
  });

  it('is empty without expenses', () => {
    expect(expensesByCategory([])).toEqual([]);
  });
});

describe('monthlyTotals', () => {
  it('buckets by month and fills empty months with zero', () => {
    expect(monthlyTotals(entries, ['2026-09', '2026-10', '2026-11'])).toEqual([
      { month: '2026-09', income: 0, expense: 0, net: 0 },
      { month: '2026-10', income: 0, expense: 1000, net: -1000 },
      { month: '2026-11', income: 200000, expense: 100000, net: 100000 },
    ]);
  });
});
