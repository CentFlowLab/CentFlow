import { goalEvolution, goalStatus, remainingAmountMinor, savedAmountMinor } from '../goals';

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

describe('goalStatus', () => {
  const c = (id: string, amount: number, date: string) => ({ id, amount, date });

  it('reports progress, remaining and no completion date while in progress', () => {
    expect(
      goalStatus(2000000, [c('a', 500000, '2026-09-01'), c('b', 250000, '2026-10-01')]),
    ).toEqual({
      saved: 750000,
      remaining: 1250000,
      ratio: 0.375,
      reached: false,
      surplus: 0,
      achievedOn: null,
    });
    expect(goalStatus(10000, [])).toMatchObject({ saved: 0, ratio: 0, reached: false });
  });

  it('dates completion on the contribution that reached the target, whatever the order', () => {
    const status = goalStatus(2000000, [
      c('c', 600000, '2026-11-08'),
      c('a', 1500000, '2026-10-01'),
      c('b', 100000, '2026-10-15'),
    ]);
    expect(status).toMatchObject({ reached: true, achievedOn: '2026-11-08', ratio: 1 });
    // Ultrapassado: o valor real fica, a barra fica a 100 %.
    expect(status.saved).toBe(2200000);
    expect(status.surplus).toBe(200000);
    expect(status.remaining).toBe(0);
  });

  it('goes back to in progress when the target rises above what was saved', () => {
    const contributions = [c('a', 2000000, '2026-10-01')];
    expect(goalStatus(2000000, contributions).reached).toBe(true);
    expect(goalStatus(2500000, contributions)).toMatchObject({
      reached: false,
      achievedOn: null,
      remaining: 500000,
    });
  });
});

describe('goalEvolution', () => {
  it('groups contributions by month in order with the running total', () => {
    expect(
      goalEvolution([
        { amount: 300, date: '2026-11-02' },
        { amount: 100, date: '2026-09-30' },
        { amount: 200, date: '2026-11-20' },
      ]),
    ).toEqual([
      { month: '2026-09', amount: 100, cumulative: 100 },
      { month: '2026-11', amount: 500, cumulative: 600 },
    ]);
    expect(goalEvolution([])).toEqual([]);
  });
});
