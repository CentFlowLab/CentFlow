import { moveItem, reorderTarget } from '../components/reorder';

describe('reorderTarget', () => {
  const heights = [50, 50, 50, 50];

  it('stays put until the centre passes the neighbour centre', () => {
    expect(reorderTarget(heights, 0, 0)).toBe(0);
    expect(reorderTarget(heights, 0, 49)).toBe(0);
    expect(reorderTarget(heights, 0, 51)).toBe(1);
    expect(reorderTarget(heights, 3, -51)).toBe(2);
  });

  it('moves several rows at once and clamps to the ends', () => {
    expect(reorderTarget(heights, 0, 160)).toBe(3);
    expect(reorderTarget(heights, 0, 1000)).toBe(3);
    expect(reorderTarget(heights, 3, -1000)).toBe(0);
  });

  it('works with rows of different heights', () => {
    // Linha 1 é alta (100): o centro dela está em 100.
    expect(reorderTarget([50, 100, 50], 0, 60)).toBe(0);
    expect(reorderTarget([50, 100, 50], 0, 80)).toBe(1);
  });
});

describe('moveItem', () => {
  it('moves without touching the original', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(moveItem(items, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(items, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(items).toEqual(['a', 'b', 'c', 'd']);
  });
});
