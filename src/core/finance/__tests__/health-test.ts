import type { MonthHistory } from '../forecast';
import { buildFinancialHealth, type HealthInput } from '../health';
import type { Subscription } from '../types';

function month(id: string, income: number, expense: number): MonthHistory {
  return { month: id, income, expense, byCategory: new Map() };
}

const rent: Subscription = {
  id: 's1',
  name: 'Renda',
  amount: 70_000,
  currency: 'EUR',
  period: 'monthly',
  status: 'active',
  startsOn: '2026-01-01',
  nextOn: '2026-12-01',
  categoryId: null,
  previousAmount: null,
  amountChangedOn: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function input(overrides: Partial<HealthInput> = {}): HealthInput {
  return {
    currency: 'EUR',
    accounts: [],
    history: [],
    subscriptions: [],
    ...overrides,
  };
}

describe('buildFinancialHealth', () => {
  it('says there is no data instead of judging an empty history', () => {
    const health = buildFinancialHealth(input());
    expect(health.overall).toBe('noData');
    expect(health.pillars.map((pillar) => pillar.status)).toEqual(['noData', 'noData', 'noData']);
  });

  it('rates a healthy situation as solid', () => {
    const health = buildFinancialHealth(
      input({
        history: [month('2026-09', 200_000, 140_000), month('2026-10', 200_000, 140_000)],
        accounts: [
          { type: 'bank', currency: 'EUR', balance: 300_000 },
          { type: 'savings', currency: 'EUR', balance: 600_000 },
          // Investimentos e outras moedas não contam para o fundo de emergência.
          { type: 'investment', currency: 'EUR', balance: 5_000_000 },
          { type: 'bank', currency: 'USD', balance: 5_000_000 },
        ],
        subscriptions: [rent],
      }),
    );
    expect(health.pillars).toEqual([
      { key: 'savingsRate', status: 'good', value: 0.3 },
      { key: 'emergencyFund', status: 'good', value: 900_000 / 140_000 },
      { key: 'fixedCosts', status: 'good', value: 0.35 },
    ]);
    expect(health.overall).toBe('solid');
  });

  it('flags spending above income and a thin reserve', () => {
    const health = buildFinancialHealth(
      input({
        history: [month('2026-09', 100_000, 110_000), month('2026-10', 100_000, 110_000)],
        accounts: [{ type: 'bank', currency: 'EUR', balance: -20_000 }],
      }),
    );
    expect(health.pillars[0]).toMatchObject({ status: 'attention' });
    expect(health.pillars[1]).toEqual({ key: 'emergencyFund', status: 'attention', value: 0 });
    // Sem subscrições não se sabe o peso dos encargos fixos.
    expect(health.pillars[2]).toMatchObject({ status: 'noData' });
    expect(health.overall).toBe('attention');
  });

  it('needs two months with income before rating savings', () => {
    const health = buildFinancialHealth(
      input({ history: [month('2026-09', 0, 50_000), month('2026-10', 150_000, 50_000)] }),
    );
    expect(health.pillars[0]).toMatchObject({ status: 'noData' });
    expect(health.pillars[1]).toMatchObject({ status: 'attention' });
  });
});
