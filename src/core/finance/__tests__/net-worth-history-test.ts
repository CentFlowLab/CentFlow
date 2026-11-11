import {
  liabilityProgress,
  MAX_VALUATIONS,
  netWorthHistory,
  recordValuation,
  valueOn,
  withOrigin,
} from '../net-worth-history';

const house = {
  type: 'property' as const,
  currency: 'EUR',
  amount: 20_000_000,
  valuedOn: '2026-01-15',
  valueHistory: [],
};

describe('recordValuation', () => {
  it('keeps the previous valuation when the value or date changes', () => {
    expect(
      recordValuation(house, { amount: 21_000_000, currency: 'EUR', valuedOn: '2026-06-01' }),
    ).toEqual([{ amount: 20_000_000, valuedOn: '2026-01-15' }]);
  });

  it('treats a change on the same day as a correction', () => {
    expect(
      recordValuation(house, { amount: 19_500_000, currency: 'EUR', valuedOn: '2026-01-15' }),
    ).toEqual([]);
    expect(recordValuation(house, { ...house })).toEqual([]);
  });

  it('starts over in another currency and keeps the history in date order, bounded', () => {
    expect(recordValuation(house, { amount: 1, currency: 'USD', valuedOn: '2026-06-01' })).toEqual(
      [],
    );
    const backdated = recordValuation(
      { ...house, valueHistory: [{ amount: 19_000_000, valuedOn: '2025-12-01' }] },
      { amount: 18_000_000, currency: 'EUR', valuedOn: '2025-06-01' },
    );
    expect(backdated.map((point) => point.valuedOn)).toEqual(['2025-12-01', '2026-01-15']);
    const long = Array.from({ length: MAX_VALUATIONS + 5 }, (_, index) => ({
      amount: index + 1,
      valuedOn: `20${String(10 + Math.floor(index / 12)).padStart(2, '0')}-${String((index % 12) + 1).padStart(2, '0')}-01`,
    }));
    expect(
      recordValuation(
        { ...house, valuedOn: '2030-01-01', valueHistory: long },
        { amount: 1, currency: 'EUR', valuedOn: '2030-02-01' },
      ),
    ).toHaveLength(MAX_VALUATIONS);
  });
});

describe('valueOn', () => {
  const item = {
    amount: 21_000_000,
    valuedOn: '2026-06-01',
    valueHistory: [{ amount: 20_000_000, valuedOn: '2026-01-15' }],
  };

  it('uses the latest valuation up to the day, nothing before the first one', () => {
    expect(valueOn(item, '2025-12-31')).toBeNull();
    expect(valueOn(item, '2026-03-31')).toBe(20_000_000);
    expect(valueOn(item, '2026-06-30')).toBe(21_000_000);
  });
});

describe('netWorthHistory', () => {
  it('adds month-end account balances, assets and debts in one currency', () => {
    const points = netWorthHistory({
      months: ['2026-01', '2026-02', '2026-03'],
      currency: 'EUR',
      accounts: [
        { id: 'bank', type: 'bank', currency: 'EUR', initialBalance: 100_000, since: '2026-02-01' },
        { id: 'save', type: 'savings', currency: 'EUR', initialBalance: 0, since: '2026-02-01' },
        { id: 'usd', type: 'bank', currency: 'USD', initialBalance: 999_999, since: '2026-01-01' },
      ],
      flows: [
        { accountId: 'bank', month: '2026-02', net: -30_000 },
        // Transferência de 20 000: sai de um lado e entra no outro, o total não muda.
        { accountId: 'bank', month: '2026-03', net: -20_000 },
        { accountId: 'save', month: '2026-03', net: 20_000 },
      ],
      wealth: [
        { ...house, valuedOn: '2026-03-10' },
        {
          type: 'mortgage',
          currency: 'EUR',
          amount: 15_000_000,
          valuedOn: '2026-03-01',
          valueHistory: [],
        },
      ],
    });
    // Janeiro: sem contas nem bens nesta moeda, fica de fora.
    expect(points).toEqual([
      { month: '2026-02', accounts: 70_000, assets: 0, liabilities: 0, netWorth: 70_000 },
      {
        month: '2026-03',
        accounts: 70_000,
        assets: 20_000_000,
        liabilities: 15_000_000,
        netWorth: 70_000 + 20_000_000 - 15_000_000,
      },
    ]);
  });

  it('carries balances through months without entries and follows revaluations and payoffs', () => {
    const points = netWorthHistory({
      months: ['2026-04', '2026-05', '2026-06', '2026-07'],
      currency: 'EUR',
      accounts: [
        { id: 'bank', type: 'bank', currency: 'EUR', initialBalance: 50_000, since: '2026-04-01' },
      ],
      // Só há movimentos em abril: maio, junho e julho repetem o saldo.
      flows: [{ accountId: 'bank', month: '2026-04', net: -10_000 }],
      wealth: [
        {
          type: 'loan',
          currency: 'EUR',
          amount: 200_000,
          valuedOn: '2026-06-01',
          valueHistory: [{ amount: 300_000, valuedOn: '2026-04-01' }],
          // Pago a 15 de julho: em julho já não conta.
          closedOn: '2026-07-15',
        },
      ],
    });
    expect(points.map((point) => [point.month, point.accounts, point.liabilities])).toEqual([
      ['2026-04', 40_000, 300_000],
      ['2026-05', 40_000, 300_000],
      ['2026-06', 40_000, 200_000],
      ['2026-07', 40_000, 0],
    ]);
  });
});

describe('starting value of a debt', () => {
  it('puts the origin first and drops older points', () => {
    const history = [
      { amount: 900, valuedOn: '2025-01-01' },
      { amount: 800, valuedOn: '2026-01-01' },
    ];
    expect(withOrigin(history, { amount: 1000, valuedOn: '2025-06-01' })).toEqual([
      { amount: 1000, valuedOn: '2025-06-01' },
      { amount: 800, valuedOn: '2026-01-01' },
    ]);
    expect(withOrigin(history, undefined)).toEqual(history);
  });

  it('never trims the origin when the history is full', () => {
    let item = {
      amount: 100_000,
      currency: 'EUR',
      valuedOn: '2010-01-01',
      valueHistory: withOrigin([], { amount: 200_000, valuedOn: '2009-01-01' }),
    };
    for (let month = 1; month <= MAX_VALUATIONS + 10; month += 1) {
      const valuedOn = `${2010 + Math.floor(month / 12)}-${String((month % 12) + 1).padStart(2, '0')}-01`;
      const next = { amount: item.amount - 100, currency: 'EUR', valuedOn };
      item = { ...next, valueHistory: recordValuation(item, next) };
    }
    expect(item.valueHistory).toHaveLength(MAX_VALUATIONS);
    expect(item.valueHistory[0]).toEqual({ amount: 200_000, valuedOn: '2009-01-01' });
  });

  it('measures what was paid, and everything once it is closed', () => {
    const loan = {
      type: 'loan' as const,
      amount: 1_550_000,
      valueHistory: [{ amount: 2_000_000, valuedOn: '2024-03-01' }],
    };
    expect(liabilityProgress(loan)).toEqual({
      original: 2_000_000,
      originalOn: '2024-03-01',
      paid: 450_000,
      ratio: 0.225,
    });
    expect(liabilityProgress({ ...loan, closedOn: '2026-11-10' })?.ratio).toBe(1);
    expect(liabilityProgress({ ...loan, type: 'property' })).toBeNull();
    expect(liabilityProgress({ ...loan, valueHistory: [] })).toBeNull();
  });
});
