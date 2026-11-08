import { isMoreActive, MOBILE_PRIMARY_ITEMS, NAV_ITEMS } from '../nav-items';

describe('navigation config', () => {
  it('covers the nine main areas exactly once', () => {
    const keys = NAV_ITEMS.map((item) => item.key);
    expect(new Set(keys).size).toBe(9);
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
