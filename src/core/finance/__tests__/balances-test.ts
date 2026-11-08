import {
  balanceFromFlows,
  computeBalances,
  EMPTY_FLOWS,
  flowsFromEntries,
  totalsByCurrency,
  type Entry,
} from '..';

type FlowEntry = Pick<Entry, 'type' | 'amount' | 'accountId' | 'destinationAccountId'>;

const income = (accountId: string, amount: number): FlowEntry => ({
  type: 'income',
  amount,
  accountId,
  destinationAccountId: null,
});
const expense = (accountId: string, amount: number): FlowEntry => ({
  type: 'expense',
  amount,
  accountId,
  destinationAccountId: null,
});
const transfer = (from: string, to: string, amount: number): FlowEntry => ({
  type: 'transfer',
  amount,
  accountId: from,
  destinationAccountId: to,
});

describe('balanceFromFlows', () => {
  it('applies initial + income − expense − out + in', () => {
    expect(
      balanceFromFlows(10000, { income: 5000, expense: 2000, transferOut: 1000, transferIn: 300 }),
    ).toBe(12300);
  });

  it('keeps the initial balance when there is no activity', () => {
    expect(balanceFromFlows(-2500, EMPTY_FLOWS)).toBe(-2500);
  });

  it('refuses unsafe results', () => {
    expect(() => balanceFromFlows(Number.MAX_SAFE_INTEGER, { ...EMPTY_FLOWS, income: 10 })).toThrow(
      RangeError,
    );
  });
});

describe('flowsFromEntries', () => {
  it('counts each entry once per involved account', () => {
    const flows = flowsFromEntries([
      income('a', 100000),
      expense('a', 2550),
      transfer('a', 'b', 30000),
      expense('b', 1000),
    ]);
    expect(flows.get('a')).toEqual({
      income: 100000,
      expense: 2550,
      transferOut: 30000,
      transferIn: 0,
    });
    expect(flows.get('b')).toEqual({ income: 0, expense: 1000, transferOut: 0, transferIn: 30000 });
  });
});

describe('computeBalances', () => {
  const accounts = [
    { id: 'a', currency: 'EUR', initialBalance: 50000 },
    { id: 'b', currency: 'EUR', initialBalance: 0 },
    { id: 'c', currency: 'USD', initialBalance: 1000 },
  ];

  it('produces per-account balances', () => {
    const flows = flowsFromEntries([
      income('a', 100000),
      expense('a', 2550),
      transfer('a', 'b', 30000),
      expense('b', 1000),
    ]);
    expect(computeBalances(accounts, flows)).toEqual([
      { accountId: 'a', currency: 'EUR', balance: 117450 },
      { accountId: 'b', currency: 'EUR', balance: 29000 },
      { accountId: 'c', currency: 'USD', balance: 1000 },
    ]);
  });

  it('does not change the total wealth with transfers', () => {
    const before = totalsByCurrency(computeBalances(accounts, flowsFromEntries([])));
    const after = totalsByCurrency(
      computeBalances(
        accounts,
        flowsFromEntries([transfer('a', 'b', 12345), transfer('b', 'a', 5)]),
      ),
    );
    expect(after).toEqual(before);
  });

  it('sums totals per currency without mixing them', () => {
    const totals = totalsByCurrency(computeBalances(accounts, new Map()));
    expect(totals.get('EUR')).toBe(50000);
    expect(totals.get('USD')).toBe(1000);
  });

  it('sums many small amounts exactly (no floating point drift)', () => {
    const entries = Array.from({ length: 1000 }, () => expense('a', 10)); // 1000 × 0,10 €
    const [balance] = computeBalances(
      [{ id: 'a', currency: 'EUR', initialBalance: 10000 }],
      flowsFromEntries(entries),
    );
    expect(balance?.balance).toBe(0);
  });
});
