import {
  basicAuth,
  canRefresh,
  errorFromStatus,
  isStale,
  parseT212,
  validCredentials,
} from '../trading212';

const summary = {
  cash: { availableToTrade: 120.5, inPies: 3.2, reservedForOrders: 10 },
  currency: 'EUR',
  id: 1,
  investments: {
    currentValue: 2450.33,
    realizedProfitLoss: 15.1,
    totalCost: 2200,
    unrealizedProfitLoss: 250.33,
  },
  totalValue: 2584.03,
};
const positions = [
  {
    averagePricePaid: 100,
    currentPrice: 112.5,
    instrument: { currency: 'USD', isin: 'US0378331005', name: 'Apple', ticker: 'AAPL_US_EQ' },
    quantity: 5,
    walletImpact: {
      currency: 'EUR',
      currentValue: 520.12,
      fxImpact: -3.1,
      totalCost: 470,
      unrealizedProfitLoss: 50.12,
    },
  },
  {
    averagePricePaid: 80,
    currentPrice: 95,
    instrument: { currency: 'EUR', name: 'VWCE', ticker: 'VWCEd_EQ' },
    quantity: 20,
    walletImpact: {
      currency: 'EUR',
      currentValue: 1930.21,
      totalCost: 1730,
      unrealizedProfitLoss: 200.21,
    },
  },
];

describe('Trading 212', () => {
  it('turns the official responses into a snapshot in minor units, largest position first', () => {
    const result = parseT212(summary, positions, '2026-11-12T10:00:00.000Z');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot).toMatchObject({
      currency: 'EUR',
      cashAvailable: 12050,
      cashOther: 1320,
      invested: 245033,
      cost: 220000,
      unrealized: 25033,
      realized: 1510,
      total: 258403,
    });
    expect(result.snapshot.positions.map((p) => [p.ticker, p.value, p.unrealized])).toEqual([
      ['VWCEd_EQ', 193021, 20021],
      ['AAPL_US_EQ', 52012, 5012],
    ]);
    // O total da conta não soma duas vezes o investido e o dinheiro.
    expect(result.snapshot.total).toBe(258403);
  });

  it('refuses malformed answers instead of showing invented numbers', () => {
    expect(parseT212(null, [], 'x')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseT212({ ...summary, currency: 'euro' }, [], 'x')).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(parseT212(summary, 'nope', 'x')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('throttles refreshes and flags stale data', () => {
    const now = Date.parse('2026-11-12T10:00:00.000Z');
    expect(canRefresh(null, now)).toBe(true);
    expect(canRefresh('2026-11-12T09:59:55.000Z', now)).toBe(false);
    expect(canRefresh('2026-11-12T09:59:49.000Z', now)).toBe(true);
    expect(isStale('2026-11-12T09:50:00.000Z', now)).toBe(false);
    expect(isStale('2026-11-12T09:40:00.000Z', now)).toBe(true);
    expect(isStale(null, now)).toBe(true);
  });

  it('validates credentials and builds the Basic header', () => {
    expect(
      validCredentials({ apiKey: ' key-12345 ', apiSecret: 's', environment: 'live' }),
    ).toEqual({
      apiKey: 'key-12345',
      apiSecret: 's',
      environment: 'live',
    });
    expect(validCredentials({ apiKey: 'short', apiSecret: 's', environment: 'live' })).toBeNull();
    expect(
      validCredentials({ apiKey: 'key-12345', apiSecret: 's', environment: 'prod' }),
    ).toBeNull();
    // "key:sécret" em UTF-8 → base64 (calculado à parte).
    expect(basicAuth('key', 'sécret')).toBe('Basic a2V5OnPDqWNyZXQ=');
    expect(errorFromStatus(401)).toBe('unauthorized');
    expect(errorFromStatus(429)).toBe('rateLimited');
    expect(errorFromStatus(500)).toBe('unavailable');
  });
});
