/** Dinheiro em cêntimos inteiros — evita erros de float (10.10 + 0.20). */

export function safeAmount(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function eurosToCents(euros: number): number {
  return Math.round(safeAmount(euros) * 100);
}

export function centsToEuros(cents: number): number {
  return cents / 100;
}

export function roundMoney(euros: number): number {
  return centsToEuros(Math.round(safeAmount(euros) * 100));
}

export function addMoney(...values: number[]): number {
  const totalCents = values.reduce((sum, value) => sum + eurosToCents(value), 0);
  return centsToEuros(totalCents);
}

export function subtractMoney(minuend: number, subtrahend: number): number {
  return centsToEuros(eurosToCents(minuend) - eurosToCents(subtrahend));
}

export function formatMoney(
  euros: number,
  locale = 'pt-PT',
  currency = 'EUR',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoney(euros));
}
