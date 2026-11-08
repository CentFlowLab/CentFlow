import { currencyExponent, type CurrencyCode } from './currency';

/**
 * Valor monetário em unidades mínimas inteiras (cêntimos para EUR).
 * Nunca usar números decimais para guardar ou somar dinheiro.
 */
export type Money = Readonly<{
  amountMinor: number;
  currency: CurrencyCode;
}>;

export class CurrencyMismatchError extends Error {
  constructor(expected: CurrencyCode, received: CurrencyCode) {
    super(`Currency mismatch: expected ${expected}, received ${received}`);
    this.name = 'CurrencyMismatchError';
  }
}

function assertSafeInteger(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Amount must be a safe integer in minor units, received ${value}`);
  }
}

export function money(amountMinor: number, currency: CurrencyCode): Money {
  assertSafeInteger(amountMinor);
  return { amountMinor, currency };
}

/** Converte um valor em unidades principais (ex.: 12.34 €) para unidades mínimas (1234). */
export function toMinorUnits(amountMajor: number, currency: CurrencyCode): number {
  if (!Number.isFinite(amountMajor)) {
    throw new RangeError(`Amount must be finite, received ${amountMajor}`);
  }
  const factor = 10 ** currencyExponent(currency);
  const minor = Math.round(amountMajor * factor);
  // Evita "-0" em valores negativos arredondados para zero.
  return minor === 0 ? 0 : minor;
}

export function toMajorUnits(amountMinor: number, currency: CurrencyCode): number {
  return amountMinor / 10 ** currencyExponent(currency);
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

export function sumMoney(values: readonly Money[], currency: CurrencyCode): Money {
  return values.reduce<Money>((total, value) => addMoney(total, value), money(0, currency));
}

export function isZero(value: Money): boolean {
  return value.amountMinor === 0;
}

export function isNegative(value: Money): boolean {
  return value.amountMinor < 0;
}
