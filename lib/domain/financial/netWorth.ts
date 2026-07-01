import type {
  Account,
  Credit,
  InventoryItem,
  NetWorthInput,
  NetWorthProjection,
  NetWorthResult,
  RecurringInvestment,
} from '@/lib/domain/types';

import { addMoney, roundMoney, subtractMoney } from './money';

export function sumAccountBalances(accounts: Account[]): number {
  return roundMoney(accounts.reduce((sum, account) => addMoney(sum, account.balance), 0));
}

export function sumInventoryValue(inventory: InventoryItem[]): number {
  return roundMoney(inventory.reduce((sum, item) => addMoney(sum, item.value), 0));
}

export function sumRecurringInvestments(investments: RecurringInvestment[]): number {
  return roundMoney(
    investments
      .filter((inv) => inv.isActive || inv.appliedAmount > 0)
      .reduce((sum, inv) => addMoney(sum, inv.currentValue), 0),
  );
}

export function sumGoalSavings(goals: Array<{ current: number }>): number {
  return roundMoney(
    goals.reduce((sum, goal) => addMoney(sum, Math.max(0, goal.current)), 0),
  );
}

export function calculateNetWorth(input: NetWorthInput): NetWorthResult {
  const accountsTotal = sumAccountBalances(input.accounts);
  const inventoryTotal = sumInventoryValue(input.inventory);
  const investmentsTotal = sumRecurringInvestments(input.investments);
  const savingsTotal = input.savings ?? 0;
  const liabilitiesTotal = input.credits.reduce(
    (sum, credit) => addMoney(sum, credit.outstandingBalance),
    0,
  );

  const totalAssets = addMoney(accountsTotal, inventoryTotal, investmentsTotal, savingsTotal);
  const netWorth = subtractMoney(totalAssets, liabilitiesTotal);

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
    totalLiabilities: roundMoney(liabilitiesTotal),
    netWorth: roundMoney(netWorth),
    breakdown: {
      accounts: accountsTotal,
      inventory: inventoryTotal,
      investments: investmentsTotal,
      savings: savingsTotal,
      liabilities: roundMoney(liabilitiesTotal),
    },
    assetsByCategory,
  };
}
export function calculateNetWorthChangePercent(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return roundMoney(((current - previous) / Math.abs(previous)) * 100);
}

/** Património consolidado: contas + objetivos reservados + inventário − créditos. */
export function calculateConsolidatedNetWorth(input: {
  accounts: Account[];
  goals: Array<{ current: number }>;
  inventory: InventoryItem[];
  credits: Credit[];
  investments?: RecurringInvestment[];
}): NetWorthResult {
  return calculateNetWorth({
    accounts: input.accounts,
    inventory: input.inventory,
    investments: input.investments ?? [],
    savings: sumGoalSavings(input.goals),
    credits: input.credits,
  });
}

export type { Credit, NetWorthInput, NetWorthProjection, NetWorthResult };
