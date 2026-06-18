import type {
  Account,
  Credit,
  InventoryItem,
  NetWorthInput,
  NetWorthResult,
  RecurringInvestment,
} from './types';

/**
 * Soma saldos de contas.
 * Os saldos devem refletir o dinheiro líquido disponível — não deduzir
 * montantes já transferidos para investimentos (evita dupla contagem).
 */
export function sumAccountBalances(accounts: Account[]): number {
  return accounts.reduce((sum, account) => sum + account.balance, 0);
}

/** Soma valor de mercado do inventário. */
export function sumInventoryValue(inventory: InventoryItem[]): number {
  return inventory.reduce((sum, item) => sum + item.value, 0);
}

/**
 * Calcula valor total de investimentos recorrentes.
 *
 * Regras (correção vs. versão web):
 * - Usa `currentValue` (valor de mercado), não `appliedAmount`
 * - Inclui regras ativas OU investimentos com montante já aplicado
 * - NÃO subtrai destes valores os saldos de conta — são buckets distintos
 * - Não projeta contribuições futuras de regras ativas
 */
export function sumRecurringInvestments(investments: RecurringInvestment[]): number {
  return investments
    .filter((inv) => inv.isActive || inv.appliedAmount > 0)
    .reduce((sum, inv) => sum + inv.currentValue, 0);
}

/** Soma saldos em dívida de créditos. */
export function sumCreditLiabilities(credits: Credit[]): number {
  return credits.reduce((sum, credit) => sum + credit.outstandingBalance, 0);
}

/** Soma poupanças registadas em objetivos. */
export function sumGoalSavings(goals: Array<{ current: number }>): number {
  return goals.reduce((sum, goal) => sum + Math.max(0, goal.current), 0);
}

/**
 * Calcula património líquido e breakdown completo.
 * Função central reutilizável em Dashboard, Análises e Ativos.
 */
export function calculateNetWorth(input: NetWorthInput): NetWorthResult {
  const accountsTotal = sumAccountBalances(input.accounts);
  const inventoryTotal = sumInventoryValue(input.inventory);
  const investmentsTotal = sumRecurringInvestments(input.investments);
  const savingsTotal = input.savings ?? 0;
  const liabilitiesTotal = sumCreditLiabilities(input.credits);

  const totalAssets = accountsTotal + inventoryTotal + investmentsTotal + savingsTotal;
  const netWorth = totalAssets - liabilitiesTotal;

  const assetsByCategory = [
    { key: 'accounts' as const, label: 'Contas', value: accountsTotal },
    { key: 'inventory' as const, label: 'Inventário', value: inventoryTotal },
    { key: 'investments' as const, label: 'Investimentos', value: investmentsTotal },
    ...(savingsTotal > 0
      ? [{ key: 'savings' as const, label: 'Poupanças', value: savingsTotal }]
      : []),
  ].filter((category) => category.value > 0);

  return {
    totalAssets,
    totalLiabilities: liabilitiesTotal,
    netWorth,
    breakdown: {
      accounts: accountsTotal,
      inventory: inventoryTotal,
      investments: investmentsTotal,
      savings: savingsTotal,
      liabilities: liabilitiesTotal,
    },
    assetsByCategory,
  };
}

/** Calcula variação percentual entre dois valores de património. */
export function calculateNetWorthChangePercent(
  current: number,
  previous: number,
): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}
