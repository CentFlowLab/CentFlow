import { assessBudget, budgetWindow, referenceForMonth, type BudgetCandidate } from '../budgets';
import { addDays, addMonths, type CalendarDate } from '../dates';
import { buildMonthForecast, type ForecastInput } from '../forecast';
import { resolvePrimaryCurrency } from '../overview';
import { presetRange, type PeriodPreset } from '../periods';
import { reportRanges, type ReportPreset } from '../reports';

// Uso do mês financeiro (ADR-077) nos orçamentos, previsão, relatórios e filtros. Com início
// no dia 1 tudo tem de ser IDÊNTICO ao comportamento de sempre (sem `startDay`).

const food = {
  categoryId: 'food',
  currency: 'EUR',
  period: 'monthly' as const,
  startsOn: '2020-01-01',
  amount: 10_000,
};

function expense(amount: number, date: CalendarDate): BudgetCandidate {
  return { type: 'expense', amount, date, categoryId: 'food', currency: 'EUR' };
}

function forecastInput(overrides: Partial<ForecastInput> = {}): ForecastInput {
  return {
    today: '2026-11-13',
    currency: 'EUR',
    availableBalance: 200_000,
    monthToDate: { income: 0, expense: 0, byCategory: new Map() },
    history: [],
    subscriptions: [],
    ...overrides,
  };
}

describe('start day 1 is identical to the calendar month', () => {
  const days: CalendarDate[] = [];
  for (let day = '2024-01-01'; day <= '2026-12-31'; day = addDays(day, 7)) days.push(day);
  days.push('2024-02-29', '2025-12-31', '2026-03-31');

  it('in budgets', () => {
    const lines = days.map((day, index) => expense(100 + index, day));
    for (const day of days) {
      expect(assessBudget(food, lines, day, 1)).toEqual(assessBudget(food, lines, day));
      expect(budgetWindow('monthly', day, food.startsOn, 1)).toEqual(
        budgetWindow('monthly', day, food.startsOn),
      );
    }
  });

  it('in reports and filters', () => {
    const reports: ReportPreset[] = ['month', 'quarter', 'year'];
    const periods: PeriodPreset[] = ['all', 'thisMonth', 'lastMonth', 'last3Months', 'thisYear'];
    for (const day of days) {
      for (const preset of reports)
        expect(reportRanges(preset, day, undefined, 1)).toEqual(reportRanges(preset, day));
      for (const preset of periods)
        expect(presetRange(preset, day, 1)).toEqual(presetRange(preset, day));
    }
  });

  it('in the forecast', () => {
    for (const day of days) {
      const input = forecastInput({ today: day });
      expect(buildMonthForecast({ ...input, startDay: 1 })).toEqual(buildMonthForecast(input));
    }
  });
});

describe('start day 25', () => {
  it('counts a budget from 25 Oct to 24 Nov and compares with the previous period', () => {
    const lines = [
      expense(1000, '2026-10-24'),
      expense(2000, '2026-10-25'),
      expense(3000, '2026-11-24'),
      expense(9999, '2026-11-25'),
      expense(4000, '2026-09-30'),
    ];
    const result = assessBudget(food, lines, '2026-11-13', 25);
    expect(result.window).toEqual({ start: '2026-10-25', end: '2026-11-24' });
    expect(result.figures.spent).toBe(5000);
    // Período anterior: 25 set – 24 out.
    expect(result.previous?.spent).toBe(5000);
    // Num mês já passado, a referência é o último dia do período.
    expect(referenceForMonth('2026-10', '2026-11-13', 25)).toBe('2026-10-24');
    expect(referenceForMonth('2026-11', '2026-11-13', 25)).toBe('2026-11-13');
  });

  it('uses the financial month only in the reports "month" preset', () => {
    expect(reportRanges('month', '2026-11-13', undefined, 25)).toEqual({
      current: { from: '2026-10-25', to: '2026-11-24' },
      previous: { from: '2026-09-25', to: '2026-10-24' },
    });
    expect(reportRanges('year', '2026-11-13', undefined, 25)).toEqual(
      reportRanges('year', '2026-11-13'),
    );
    expect(reportRanges('quarter', '2026-11-13', undefined, 25)).toEqual(
      reportRanges('quarter', '2026-11-13'),
    );
  });

  it('makes the Movimentos month presets financial and keeps the others', () => {
    expect(presetRange('thisMonth', '2026-11-13', 25)).toEqual({
      from: '2026-10-25',
      to: '2026-11-24',
    });
    expect(presetRange('lastMonth', '2026-11-13', 25)).toEqual({
      from: '2026-09-25',
      to: '2026-10-24',
    });
    expect(presetRange('last3Months', '2026-11-13', 25)).toEqual({
      from: '2026-08-25',
      to: '2026-11-24',
    });
    expect(presetRange('thisYear', '2026-11-13', 25)).toEqual(
      presetRange('thisYear', '2026-11-13'),
    );
    expect(presetRange('all', '2026-11-13', 25)).toEqual(presetRange('all', '2026-11-13'));
  });

  it('forecasts until the end of the financial month', () => {
    const forecast = buildMonthForecast(forecastInput({ startDay: 25 }));
    // 13 nov a 24 nov, contando hoje.
    expect(forecast.daysLeft).toBe(12);
  });
});

describe('start day 31', () => {
  it('keeps every budget period contiguous through February (the 30 March case)', () => {
    // Fevereiro de 2026 tem 28 dias: o período "março" é 28 fev – 30 mar.
    const march = assessBudget(food, [expense(700, '2026-02-28')], '2026-03-30', 31);
    expect(march.window).toEqual({ start: '2026-02-28', end: '2026-03-30' });
    expect(march.figures.spent).toBe(700);
    const withPrevious = assessBudget(
      food,
      [expense(300, '2026-02-27'), expense(700, '2026-03-01')],
      '2026-03-30',
      31,
    );
    // O anterior é 31 jan – 27 fev, não o mesmo período outra vez.
    expect(withPrevious.previous?.spent).toBe(300);
    expect(withPrevious.figures.spent).toBe(700);

    let key = '2025-01';
    for (let index = 0; index < 24; index += 1, key = addMonths(key, 1)) {
      const reference = referenceForMonth(key, '2000-01-01', 31);
      const window = budgetWindow('monthly', reference, food.startsOn, 31)!;
      const next = budgetWindow(
        'monthly',
        referenceForMonth(addMonths(key, 1), '2000-01-01', 31),
        food.startsOn,
        31,
      )!;
      expect(addDays(window.end, 1)).toBe(next.start);
    }
  });
});

describe('resolvePrimaryCurrency', () => {
  it('uses the chosen currency when an account uses it or there are no accounts', () => {
    expect(resolvePrimaryCurrency('USD', ['EUR', 'USD'])).toBe('USD');
    expect(resolvePrimaryCurrency('USD', [])).toBe('USD');
  });

  it('falls back to the automatic choice when no account uses it', () => {
    expect(resolvePrimaryCurrency('USD', ['EUR', 'EUR', 'GBP'])).toBe(
      resolvePrimaryCurrency('auto', ['EUR', 'EUR', 'GBP']),
    );
    expect(resolvePrimaryCurrency('auto', ['EUR', 'EUR', 'GBP'])).toBe('EUR');
  });
});
