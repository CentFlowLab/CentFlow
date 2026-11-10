import {
  buildMonthForecast,
  chargesBetween,
  recentPriceRises,
  spendingInsights,
  type ForecastInput,
  type MonthHistory,
} from '../forecast';
import type { Subscription } from '../types';

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 's1',
    name: 'Streaming',
    amount: 1000,
    currency: 'EUR',
    period: 'monthly',
    status: 'active',
    startsOn: '2026-01-15',
    nextOn: '2026-01-15',
    categoryId: null,
    previousAmount: null,
    amountChangedOn: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function month(id: string, income: number, expense: number, byCategory: [string, number][] = []) {
  return { month: id, income, expense, byCategory: new Map(byCategory) } satisfies MonthHistory;
}

function input(overrides: Partial<ForecastInput> = {}): ForecastInput {
  return {
    today: '2026-11-10',
    currency: 'EUR',
    availableBalance: 200_000,
    monthToDate: { income: 0, expense: 0, byCategory: new Map() },
    history: [],
    subscriptions: [],
    ...overrides,
  };
}

describe('chargesBetween', () => {
  it('rolls an old next date forward by the period', () => {
    expect(chargesBetween(subscription(), '2026-11-01', '2026-12-31')).toEqual([
      '2026-11-15',
      '2026-12-15',
    ]);
  });

  it('keeps the 31st as the last day of shorter months', () => {
    expect(
      chargesBetween(subscription({ nextOn: '2026-01-31' }), '2026-02-01', '2026-04-30'),
    ).toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('counts weekly and yearly charges and ignores paused ones', () => {
    expect(
      chargesBetween(
        subscription({ period: 'weekly', nextOn: '2026-11-02' }),
        '2026-11-10',
        '2026-11-30',
      ),
    ).toEqual(['2026-11-16', '2026-11-23', '2026-11-30']);
    expect(
      chargesBetween(
        subscription({ period: 'yearly', nextOn: '2025-12-01' }),
        '2026-11-10',
        '2026-12-31',
      ),
    ).toEqual(['2026-12-01']);
    expect(chargesBetween(subscription({ status: 'paused' }), '2026-11-01', '2026-11-30')).toEqual(
      [],
    );
  });
});

describe('buildMonthForecast', () => {
  it('has no forecast without enough history, but still splits what is available', () => {
    const forecast = buildMonthForecast(
      input({ today: '2026-11-03', subscriptions: [subscription()] }),
    );
    expect(forecast.basis).toBe('none');
    expect(forecast.endBalance).toBeNull();
    expect(forecast.upcomingTotal).toBe(1000);
    // (2000,00 € − 10,00 €) por 28 dias, contando hoje.
    expect(forecast.daysLeft).toBe(28);
    expect(forecast.dailyAllowance).toBe(Math.floor(199_000 / 28));
  });

  it('uses the usual pace, upcoming subscriptions and income not received yet', () => {
    const forecast = buildMonthForecast(
      input({
        subscriptions: [subscription()],
        history: [month('2026-08', 150_000, 91_000), month('2026-09', 150_000, 91_000)],
        monthToDate: { income: 0, expense: 30_000, byCategory: new Map() },
      }),
    );
    expect(forecast.basis).toBe('history');
    // 910 € por mês, menos 10 € de subscrições, a 12 meses / 365 dias.
    expect(forecast.dailySpend).toBe(Math.round((90_000 * 12) / 365));
    expect(forecast.expectedIncome).toBe(150_000);
    expect(forecast.projectedSpending).toBe(forecast.dailySpend! * 20);
    expect(forecast.endBalance).toBe(200_000 + 150_000 - 1000 - forecast.projectedSpending);
  });

  it('does not expect income that already came in', () => {
    const forecast = buildMonthForecast(
      input({
        history: [month('2026-09', 150_000, 50_000), month('2026-10', 150_000, 50_000)],
        monthToDate: { income: 160_000, expense: 0, byCategory: new Map() },
      }),
    );
    expect(forecast.expectedIncome).toBe(0);
  });

  it('falls back to this month pace after the first week', () => {
    const forecast = buildMonthForecast(
      input({ monthToDate: { income: 0, expense: 20_000, byCategory: new Map() } }),
    );
    expect(forecast.basis).toBe('monthPace');
    expect(forecast.dailySpend).toBe(2000);
  });
});

describe('spendingInsights', () => {
  const history = [
    month('2026-08', 150_000, 60_000, [
      ['food', 30_000],
      ['fun', 10_000],
    ]),
    month('2026-09', 150_000, 60_000, [
      ['food', 30_000],
      ['fun', 10_000],
    ]),
    month('2026-10', 150_000, 60_000, [
      ['food', 30_000],
      ['fun', 10_000],
    ]),
  ];

  it('flags a category well above its usual pace', () => {
    // Dia 15 de 30: o habitual até agora são 50 € em lazer; já vão 120 €.
    const insights = spendingInsights(
      {
        today: '2026-11-15',
        history,
        monthToDate: {
          income: 0,
          expense: 27_000,
          byCategory: new Map([
            ['fun', 12_000],
            ['food', 15_000],
          ]),
        },
      },
      { endBalance: 10_000 },
    );
    expect(insights).toEqual([
      {
        kind: 'categoryAbove',
        categoryId: 'fun',
        spent: 12_000,
        usual: 10_000,
        ratio: 2.4,
        monthExtra: 14_000,
      },
    ]);
  });

  it('notes when the month is going below the usual, and a negative end first', () => {
    const insights = spendingInsights(
      {
        today: '2026-11-15',
        history,
        monthToDate: { income: 0, expense: 10_000, byCategory: new Map([['food', 10_000]]) },
      },
      { endBalance: -5000 },
    );
    expect(insights.map((item) => item.kind)).toEqual(['endNegative', 'spendingBelow']);
  });

  it('says nothing without history', () => {
    expect(
      spendingInsights(
        {
          today: '2026-11-15',
          history: [],
          monthToDate: { income: 0, expense: 90_000, byCategory: new Map([['fun', 90_000]]) },
        },
        { endBalance: null },
      ),
    ).toEqual([]);
  });
});

describe('price rises', () => {
  const raised = subscription({
    previousAmount: 1000,
    amount: 1300,
    amountChangedOn: '2026-11-01',
  });

  it('finds recent rises with the yearly cost, not drops or old changes', () => {
    expect(recentPriceRises([raised], '2026-11-10')).toEqual([
      {
        subscriptionId: 's1',
        name: 'Streaming',
        period: 'monthly',
        currency: 'EUR',
        previous: 1000,
        amount: 1300,
        changedOn: '2026-11-01',
        yearlyIncrease: 3600,
      },
    ]);
    expect(recentPriceRises([{ ...raised, amount: 900 }], '2026-11-10')).toEqual([]);
    expect(recentPriceRises([raised], '2027-02-01')).toEqual([]);
    expect(recentPriceRises([{ ...raised, status: 'cancelled' }], '2026-11-10')).toEqual([]);
  });

  it('puts a rise among the month insights, in the same currency', () => {
    const base = {
      today: '2026-11-10',
      history: [],
      monthToDate: { income: 0, expense: 0, byCategory: new Map() },
    };
    expect(
      spendingInsights(
        { ...base, subscriptions: [raised], currency: 'EUR' },
        { endBalance: null },
      ).map((item) => item.kind),
    ).toEqual(['priceRise']);
    expect(
      spendingInsights({ ...base, subscriptions: [raised], currency: 'USD' }, { endBalance: null }),
    ).toEqual([]);
  });
});
