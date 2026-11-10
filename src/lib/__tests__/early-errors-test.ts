import { createEarlyErrorBuffer } from '../early-errors';

describe('createEarlyErrorBuffer', () => {
  it('keeps errors until the monitor arrives, then sends them in order', () => {
    const buffer = createEarlyErrorBuffer(3);
    const first = new Error('a');
    const second = new TypeError('b');
    buffer.push(first);
    buffer.push(second);
    expect(buffer.size).toBe(2);
    const captured: unknown[] = [];
    buffer.flush((error) => captured.push(error));
    expect(captured).toEqual([first, second]);
    expect(buffer.size).toBe(0);
    // Depois de carregado, envia logo.
    const later = new Error('c');
    buffer.push(later);
    expect(captured).toEqual([first, second, later]);
  });

  it('drops errors beyond the limit instead of growing without end', () => {
    const buffer = createEarlyErrorBuffer(2);
    expect(buffer.push(1)).toBe(true);
    expect(buffer.push(2)).toBe(true);
    expect(buffer.push(3)).toBe(false);
    expect(buffer.size).toBe(2);
  });
});
