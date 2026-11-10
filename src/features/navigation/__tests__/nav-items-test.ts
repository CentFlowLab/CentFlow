import { isMoreActive, isPlannedModule, MOBILE_PRIMARY_ITEMS, NAV_ITEMS } from '../nav-items';

describe('navigation config', () => {
  it('covers every area exactly once', () => {
    const keys = NAV_ITEMS.map((item) => item.key);
    expect(keys).toHaveLength(12);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('marks no area as planned once every area has its own screen', () => {
    // Carros e documentos têm ecrãs funcionais desde a Fase 4.
    expect(NAV_ITEMS.filter((item) => isPlannedModule(item.key))).toEqual([]);
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
