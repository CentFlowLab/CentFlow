import {
  assessBudget,
  budgetFigures,
  budgetLevel,
  budgetWindow,
  daySlices,
  referenceForMonth,
  shiftReference,
  spendBySlice,
  spentAmount,
  startOfWeek,
  weekSlices,
  type BudgetCandidate,
} from '../budgets';

const food = {
  categoryId: 'food',
  currency: 'EUR',
  period: 'monthly' as const,
  startsOn: '2026-01-01',
  amount: 10_000,
};

function line(
  type: BudgetCandidate['type'],
  amount: number,
  date: string,
  extra: Partial<BudgetCandidate> = {},
): BudgetCandidate {
  return {
    type,
    amount,
    date,
    categoryId: 'food',
    currency: 'EUR',
    ...extra,
  };
}

describe('budget windows', () => {
  it('uses the calendar month and clips the start when the budget begins mid-month', () => {
    expect(budgetWindow('monthly', '2026-11-08', '2026-01-01')).toEqual({
      start: '2026-11-01',
      end: '2026-11-30',
    });
    expect(budgetWindow('monthly', '2026-11-08', '2026-11-10')).toEqual({
      start: '2026-11-10',
      end: '2026-11-30',
    });
  });

  it('is inactive when the period ends before the budget starts', () => {
    expect(budgetWindow('monthly', '2026-10-15', '2026-11-01')).toBeNull();
  });

  it('starts weeks on Monday and includes Sunday', () => {
    // 2026-11-08 é domingo.
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02');
    expect(budgetWindow('weekly', '2026-11-08', '2026-01-01')).toEqual({
      start: '2026-11-02',
      end: '2026-11-08',
    });
  });

  it('uses the calendar year', () => {
    expect(budgetWindow('yearly', '2026-11-08', '2026-06-01')).toEqual({
      start: '2026-06-01',
      end: '2026-12-31',
    });
  });

  it('moves a month and a year without inventing days', () => {
    expect(shiftReference('monthly', '2026-03-31', -1)).toBe('2026-02-28');
    expect(shiftReference('yearly', '2024-02-29', 1)).toBe('2025-02-28');
    expect(shiftReference('weekly', '2026-11-08', -1)).toBe('2026-11-01');
  });

  it('reads the current month as today and another month on its last day', () => {
    expect(referenceForMonth('2026-11', '2026-11-08')).toBe('2026-11-08');
    expect(referenceForMonth('2026-10', '2026-11-08')).toBe('2026-10-31');
  });
});

describe('budget spend', () => {
  const november = { start: '2026-11-01', end: '2026-11-30' };

  it('counts only expenses of the same category and currency inside the window', () => {
    const lines = [
      line('expense', 1000, '2026-11-01'),
      line('expense', 250, '2026-11-30'),
      line('expense', 9999, '2026-10-31'),
      line('expense', 9999, '2026-12-01'),
      line('income', 4000, '2026-11-15'),
      line('transfer', 4000, '2026-11-15'),
      line('expense', 4000, '2026-11-15', { categoryId: 'rent' }),
      line('expense', 4000, '2026-11-15', { currency: 'USD' }),
    ];
    expect(spentAmount(lines, food, november)).toBe(1250);
  });

  it('drops a November expense when the month changes', () => {
    const lines = [line('expense', 1250, '2026-11-08')];
    const novemberBudget = assessBudget(food, lines, '2026-11-08');
    const decemberBudget = assessBudget(food, lines, '2026-12-08');
    expect(novemberBudget.figures.spent).toBe(1250);
    expect(decemberBudget.figures.spent).toBe(0);
  });

  it('marks 75%, 90% and 100% and keeps the unused amount', () => {
    expect(budgetLevel(7499 / 10000)).toBe('ok');
    expect(budgetLevel(0.75)).toBe('watch');
    expect(budgetLevel(0.9)).toBe('near');
    expect(budgetLevel(1)).toBe('over');
    expect(budgetFigures(12_500, 10_000)).toMatchObject({
      available: -2500,
      ratio: 1.25,
      level: 'over',
    });
  });

  it('compares with the previous period only when that period has expenses', () => {
    const withHistory = assessBudget(
      food,
      [line('expense', 2000, '2026-10-04'), line('expense', 5000, '2026-11-04')],
      '2026-11-08',
    );
    expect(withHistory.previous?.spent).toBe(2000);

    const startedNow = assessBudget(
      { ...food, startsOn: '2026-11-01' },
      [line('expense', 5000, '2026-11-04')],
      '2026-11-08',
    );
    expect(startedNow.previous).toBeNull();

    const quietPast = assessBudget(food, [line('expense', 5000, '2026-11-04')], '2026-11-08');
    expect(quietPast.previous).toBeNull();
  });

  it('builds the month in week slices and ignores income', () => {
    const slices = weekSlices('2026-11-01', '2026-11-30');
    expect(slices[0]).toEqual({ key: '2026-11-01', start: '2026-11-01', end: '2026-11-01' });
    expect(daySlices('2026-11-02', '2026-11-08')).toHaveLength(7);
    const values = spendBySlice(
      [line('expense', 300, '2026-11-03'), line('income', 900, '2026-11-03')],
      [food],
      slices,
      'EUR',
      '2026-11-08',
    );
    expect(values.reduce((sum, value) => sum + value, 0)).toBe(300);
  });
});
