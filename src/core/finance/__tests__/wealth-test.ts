import type { WealthItem } from '../types';
import { isLiabilityType, wealthTotals, netWorthSummary } from '../wealth';
import { validateWealthItemInput } from '../validation';

const base = { createdAt: '', updatedAt: '', valuedOn: '2026-11-01' };
const item = (id: string, type: WealthItem['type'], amount: number, currency = 'EUR') =>
  ({ ...base, id, name: id, type, amount, currency }) as WealthItem;

describe('wealth totals', () => {
  it('subtracts liabilities from assets per currency without mixing currencies', () => {
    const totals = wealthTotals([
      item('casa', 'property', 20000000),
      item('hipoteca', 'mortgage', 12000000),
      item('acoes', 'investment', 500000, 'USD'),
    ]);
    expect(totals).toEqual([
      { currency: 'EUR', assets: 20000000, liabilities: 12000000, net: 8000000 },
      { currency: 'USD', assets: 500000, liabilities: 0, net: 500000 },
    ]);
  });

  it('can be negative when debts exceed assets', () => {
    expect(wealthTotals([item('cartao', 'credit', 1000)])[0]?.net).toBe(-1000);
  });

  it('tells assets from liabilities', () => {
    expect(isLiabilityType('loan')).toBe(true);
    expect(isLiabilityType('property')).toBe(false);
  });
});

describe('wealth validation', () => {
  const valid = {
    name: 'Casa',
    type: 'property',
    amount: 100,
    currency: 'EUR',
    valuedOn: '2026-11-01',
  } as const;
  it('accepts a valid item', () => expect(validateWealthItemInput(valid)).toEqual({}));
  it('rejects bad type, amount and date', () => {
    const errors = validateWealthItemInput({
      ...valid,
      type: 'x' as never,
      amount: 0,
      valuedOn: '2026-02-31',
    });
    expect(Object.keys(errors).sort()).toEqual(['amount', 'type', 'valuedOn']);
  });
});

describe('netWorthSummary', () => {
  const item = (type: string, amount: number, extra: Partial<Record<string, unknown>> = {}) =>
    ({
      id: type,
      name: type,
      type,
      amount,
      currency: 'EUR',
      valuedOn: '2026-11-01',
      closedOn: null,
      ...extra,
    }) as never;

  it('separates available money, card debt, invested and other debt without counting twice', () => {
    const summary = netWorthSummary(
      [
        { type: 'bank', currency: 'EUR', balance: 300000 },
        { type: 'card', currency: 'EUR', balance: -65000 },
        { type: 'card', currency: 'EUR', balance: 1000 },
        { type: 'bank', currency: 'USD', balance: 999999 },
      ],
      [
        item('investment', 258403),
        item('property', 20000000),
        item('mortgage', 15000000),
        item('loan', 500000, { closedOn: '2026-10-01' }),
      ],
      'EUR',
    );
    expect(summary).toEqual({
      currency: 'EUR',
      available: 301000,
      cardDebt: 65000,
      invested: 258403,
      assets: 20258403,
      debt: 15065000,
      net: 301000 + 20258403 - 15065000,
    });
  });
});
