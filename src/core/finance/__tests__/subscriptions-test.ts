import { activeSubscriptionCosts, annualAmountMinor } from '../subscriptions';

describe('subscription cost', () => {
  it('counts 52 weeks, 12 months or one year', () => {
    expect(annualAmountMinor('weekly', 100)).toBe(5200);
    expect(annualAmountMinor('monthly', 100)).toBe(1200);
    expect(annualAmountMinor('yearly', 100)).toBe(100);
  });

  it('sums only active subscriptions and keeps currencies apart', () => {
    expect(
      activeSubscriptionCosts([
        { status: 'active', currency: 'EUR', period: 'monthly', amount: 1000 },
        { status: 'paused', currency: 'EUR', period: 'monthly', amount: 5000 },
        { status: 'cancelled', currency: 'EUR', period: 'yearly', amount: 9000 },
        { status: 'active', currency: 'USD', period: 'yearly', amount: 1200 },
      ]),
    ).toEqual([
      { currency: 'EUR', monthlyMinor: 1000, yearlyMinor: 12000 },
      { currency: 'USD', monthlyMinor: 100, yearlyMinor: 1200 },
    ]);
  });

  it('puts the leftover cents on the yearly total', () => {
    expect(
      activeSubscriptionCosts([
        { status: 'active', currency: 'EUR', period: 'yearly', amount: 10 },
        { status: 'active', currency: 'EUR', period: 'yearly', amount: 10 },
      ]),
    ).toEqual([{ currency: 'EUR', monthlyMinor: 1, yearlyMinor: 20 }]);
  });
});
