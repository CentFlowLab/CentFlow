import { remainingAmountMinor, savedAmountMinor } from '../goals';

describe('savings goal progress', () => {
  it('sums the given contributions and does not keep a stored total', () => {
    expect(savedAmountMinor([2500, 2500])).toBe(5000);
    expect(savedAmountMinor([])).toBe(0);
  });

  it('stops the remainder at zero when the target is already met', () => {
    expect(remainingAmountMinor(10000, 5000)).toBe(5000);
    expect(remainingAmountMinor(10000, 12000)).toBe(0);
  });
});
