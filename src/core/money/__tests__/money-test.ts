import {
  addMoney,
  currencyExponent,
  CurrencyMismatchError,
  formatMoney,
  isCurrencyCode,
  money,
  subtractMoney,
  sumMoney,
  toMajorUnits,
  toMinorUnits,
} from '..';

// Intl usa espaços especiais (NBSP / NNBSP) entre valor e símbolo.
const normalize = (value: string) => value.replace(/[\u00A0\u202F]/g, ' ');

describe('currency', () => {
  it('validates ISO 4217 codes', () => {
    expect(isCurrencyCode('EUR')).toBe(true);
    expect(isCurrencyCode('usd')).toBe(false);
    expect(isCurrencyCode('EURO')).toBe(false);
  });

  it('derives the minor unit exponent from Intl', () => {
    expect(currencyExponent('EUR')).toBe(2);
    expect(currencyExponent('JPY')).toBe(0);
  });
});

describe('minor unit conversion', () => {
  it('converts without floating point drift', () => {
    expect(toMinorUnits(0.1 + 0.2, 'EUR')).toBe(30);
    expect(toMinorUnits(19.99, 'EUR')).toBe(1999);
    expect(toMinorUnits(1.005, 'EUR')).toBe(100);
    expect(toMinorUnits(1500, 'JPY')).toBe(1500);
  });

  it('never returns negative zero', () => {
    expect(Object.is(toMinorUnits(-0.001, 'EUR'), 0)).toBe(true);
  });

  it('rejects non-finite values', () => {
    expect(() => toMinorUnits(Number.NaN, 'EUR')).toThrow(RangeError);
    expect(() => toMinorUnits(Number.POSITIVE_INFINITY, 'EUR')).toThrow(RangeError);
  });

  it('converts back to major units', () => {
    expect(toMajorUnits(1999, 'EUR')).toBe(19.99);
  });
});

describe('arithmetic', () => {
  it('adds and subtracts amounts in the same currency', () => {
    expect(addMoney(money(1050, 'EUR'), money(250, 'EUR'))).toEqual(money(1300, 'EUR'));
    expect(subtractMoney(money(1000, 'EUR'), money(1250, 'EUR'))).toEqual(money(-250, 'EUR'));
  });

  it('refuses to mix currencies', () => {
    expect(() => addMoney(money(100, 'EUR'), money(100, 'USD'))).toThrow(CurrencyMismatchError);
  });

  it('sums a list, returning zero for an empty list', () => {
    expect(sumMoney([], 'EUR')).toEqual(money(0, 'EUR'));
    expect(sumMoney([money(10, 'EUR'), money(20, 'EUR'), money(-5, 'EUR')], 'EUR')).toEqual(
      money(25, 'EUR'),
    );
  });

  it('only accepts integer minor units', () => {
    expect(() => money(10.5, 'EUR')).toThrow(RangeError);
  });
});

describe('formatMoney', () => {
  it('formats EUR for Portugal', () => {
    expect(normalize(formatMoney(money(123456, 'EUR'), 'pt-PT'))).toBe('1234,56 €');
  });

  it('formats for other locales', () => {
    expect(normalize(formatMoney(money(123456, 'EUR'), 'en-GB'))).toBe('€1,234.56');
    expect(normalize(formatMoney(money(-500, 'USD'), 'en-US'))).toBe('-$5.00');
  });

  it('shows explicit sign when requested', () => {
    expect(normalize(formatMoney(money(500, 'EUR'), 'en-GB', { signDisplay: 'always' }))).toBe(
      '+€5.00',
    );
  });

  it('can drop zero decimals', () => {
    expect(normalize(formatMoney(money(120000, 'EUR'), 'en-GB', { trimZeroDecimals: true }))).toBe(
      '€1,200',
    );
    expect(normalize(formatMoney(money(120050, 'EUR'), 'en-GB', { trimZeroDecimals: true }))).toBe(
      '€1,200.50',
    );
  });
});
