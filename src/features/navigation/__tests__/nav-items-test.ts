import { isMoreActive, isPlannedModule, MOBILE_PRIMARY_ITEMS, NAV_ITEMS } from '../nav-items';

describe('navigation config', () => {
  it('covers every area exactly once', () => {
    const keys = NAV_ITEMS.map((item) => item.key);
    expect(keys).toHaveLength(11);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('marks only unbuilt areas as planned', () => {
    expect(NAV_ITEMS.filter((item) => isPlannedModule(item.key)).map((item) => item.key)).toEqual([
      'budgets',
      'subscriptions',
      'reports',
      'wealth',
      'vehicles',
      'documents',
    ]);
  });

  it('keeps the bottom bar small enough for phones', () => {
    // 3 separadores + botão "+" + "Mais" = 5 posições.
    expect(MOBILE_PRIMARY_ITEMS).toHaveLength(3);
  });

  it('highlights "More" only for screens without their own tab', () => {
    expect(isMoreActive('index')).toBe(false);
    expect(isMoreActive('transactions')).toBe(false);
    expect(isMoreActive('vehicles')).toBe(true);
    expect(isMoreActive('more')).toBe(true);
    expect(isMoreActive(undefined)).toBe(false);
  });
});
