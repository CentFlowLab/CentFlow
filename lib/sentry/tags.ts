/** Domínios financeiros sensíveis — excluídos do auto-fix automático. */
export type FinancialDomain =
  | 'cashflow_projection'
  | 'savings_engine'
  | 'debt_amortization'
  | 'balance_calculation';

const FINANCIAL_SOURCE_PATTERNS: Record<FinancialDomain, RegExp> = {
  cashflow_projection: /cashflow|projection|buildCashflowProjection/i,
  savings_engine: /savings|margin|allocation|buildFinancialActions|calculateRealSavingsMargin/i,
  debt_amortization: /debt|amortiz|loan.?payment|buildDebtAmortization/i,
  balance_calculation: /balance|saldo|net.?worth|patrimon/i,
};

export function detectFinancialDomain(
  source: string,
  message?: string,
): FinancialDomain | null {
  const haystack = `${source} ${message ?? ''}`;
  for (const [domain, pattern] of Object.entries(FINANCIAL_SOURCE_PATTERNS) as [
    FinancialDomain,
    RegExp,
  ][]) {
    if (pattern.test(haystack)) return domain;
  }
  return null;
}

export function isFinancialDomainError(source: string, message?: string): boolean {
  return detectFinancialDomain(source, message) !== null;
}
