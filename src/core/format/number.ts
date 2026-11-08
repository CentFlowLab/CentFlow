export function formatPercent(ratio: number, locale: string, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits }).format(ratio);
}

export function formatNumber(value: number, locale: string, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}
