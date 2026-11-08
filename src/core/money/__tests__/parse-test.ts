import { amountToInputString, decimalSeparatorFor, MAX_AMOUNT_MINOR, parseAmountInput } from '..';

const ok = (amountMinor: number) => ({ ok: true, amountMinor });

describe('parseAmountInput', () => {
  it.each([
    ['12', 1200],
    ['12,5', 1250],
    ['12.5', 1250],
    ['12,50', 1250],
    ['0,01', 1],
    [',5', 50],
    ['1.234', 123400],
    ['1.234,56', 123456],
    ['1,234.56', 123456],
    ['1 234,56', 123456],
    ['1\u00A0234,56', 123456],
    ['1.234.567,89', 123456789],
    ['0', 0],
  ])('parses %s in EUR as %i cents', (input, expected) => {
    expect(parseAmountInput(input, 'EUR')).toEqual(ok(expected));
  });

  it('never loses precision on classic floating point traps', () => {
    expect(parseAmountInput('0,1', 'EUR')).toEqual(ok(10));
    expect(parseAmountInput('0,29', 'EUR')).toEqual(ok(29));
    expect(parseAmountInput('1,005', 'EUR')).toEqual(ok(100500)); // "1,005" = mil e cinco
    expect(parseAmountInput('19.99', 'EUR')).toEqual(ok(1999));
  });

  it('respects currencies without decimals', () => {
    expect(parseAmountInput('1500', 'JPY')).toEqual(ok(1500));
    expect(parseAmountInput('1,500', 'JPY')).toEqual(ok(1500));
    expect(parseAmountInput('15,5', 'JPY')).toEqual({ ok: false, error: 'invalid' });
  });

  it.each(['abc', '12,3,4', '1.2.3', '12,', '1234,567', '12€', '--1', '1e5'])(
    'rejects %s',
    (input) => {
      expect(parseAmountInput(input, 'EUR')).toEqual({ ok: false, error: 'invalid' });
    },
  );

  it('reports empty input', () => {
    expect(parseAmountInput('  ', 'EUR')).toEqual({ ok: false, error: 'empty' });
  });

  it('handles negatives only when allowed', () => {
    expect(parseAmountInput('-30', 'EUR')).toEqual({ ok: false, error: 'invalid' });
    expect(parseAmountInput('-30,5', 'EUR', { allowNegative: true })).toEqual(ok(-3050));
    expect(parseAmountInput('-0', 'EUR', { allowNegative: true })).toEqual(ok(0));
  });

  it('rejects amounts above the safe limit', () => {
    expect(parseAmountInput('99999999999999', 'EUR')).toEqual({ ok: false, error: 'tooLarge' });
    expect(parseAmountInput('10000000000', 'EUR')).toEqual(ok(MAX_AMOUNT_MINOR));
    expect(parseAmountInput('10000000000,01', 'EUR')).toEqual({ ok: false, error: 'tooLarge' });
  });
});

describe('amountToInputString', () => {
  it('round-trips with parseAmountInput', () => {
    for (const value of [0, 1, 10, 99, 100, 1250, 123456789]) {
      const text = amountToInputString(value, 'EUR', ',');
      expect(parseAmountInput(text, 'EUR')).toEqual(ok(value));
    }
  });

  it('formats with the requested separator', () => {
    expect(amountToInputString(1250, 'EUR', ',')).toBe('12,50');
    expect(amountToInputString(5, 'EUR', '.')).toBe('0.05');
    expect(amountToInputString(-1250, 'EUR', '.')).toBe('-12.50');
    expect(amountToInputString(1500, 'JPY', ',')).toBe('1500');
  });

  it('detects the locale decimal separator', () => {
    expect(decimalSeparatorFor('pt-PT')).toBe(',');
    expect(decimalSeparatorFor('en')).toBe('.');
    expect(decimalSeparatorFor('es')).toBe(',');
  });
});
