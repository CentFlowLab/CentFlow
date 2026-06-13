import { ApiError } from '@/lib/api/client';
import { buildMockDashboard } from '@/lib/data/mocks';
import { calculateFinancialProfile } from '@/lib/domain/financial-profile.service';
import type {
  FinancialProfileResult,
  FinancialProfileSignals,
} from '@/lib/domain/financial-profile.types';
import { isMockAuthEnabled } from '@/lib/auth';

import { fetchAssetsData } from './assets.service';
import { fetchNetWorthData } from './dashboard.service';
import { fetchTransactions } from './transaction.service';

async function resolveNetWorthBreakdown(): Promise<{
  accounts: number;
  investments: number;
  inventory: number;
}> {
  if (isMockAuthEnabled()) {
    const { netWorth } = buildMockDashboard();
    return {
      accounts: netWorth.breakdown.accounts,
      investments: netWorth.breakdown.investments,
      inventory: netWorth.breakdown.inventory,
    };
  }

  try {
    const netWorth = await fetchNetWorthData();
    return {
      accounts: netWorth.breakdown.accounts,
      investments: netWorth.breakdown.investments,
      inventory: netWorth.breakdown.inventory,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { accounts: 0, investments: 0, inventory: 0 };
    }
    throw error;
  }
}

async function resolveGoalCount(): Promise<number> {
  const assets = await fetchAssetsData();
  return assets.goals.length;
}

async function resolveWarrantyCount(): Promise<number> {
  const assets = await fetchAssetsData();
  return assets.warranties.length;
}

async function resolveInventoryCount(breakdownInventory: number): Promise<number> {
  const assets = await fetchAssetsData();
  if (assets.inventory.length > 0) return assets.inventory.length;
  return breakdownInventory > 0 ? 1 : 0;
}

export async function collectFinancialProfileSignals(): Promise<FinancialProfileSignals> {
  const [transactions, breakdown, goalCount, warrantyCount] = await Promise.all([
    fetchTransactions('all'),
    resolveNetWorthBreakdown(),
    resolveGoalCount(),
    resolveWarrantyCount(),
  ]);

  const receiptCount = transactions.filter(
    (transaction) => Boolean(transaction.receiptId || transaction.receiptImage),
  ).length;

  const inventoryCount = await resolveInventoryCount(breakdown.inventory);

  return {
    transactionCount: transactions.length,
    receiptCount,
    goalCount,
    warrantyCount,
    inventoryCount,
    hasPatrimonyAccounts: breakdown.accounts > 0,
    hasPatrimonyInvestments: breakdown.investments > 0,
  };
}

/**
 * Calcula o Perfil Financeiro % em tempo real a partir dos dados existentes.
 * O resultado é cacheado via React Query (staleTime ~2 min).
 */
export async function fetchFinancialProfile(): Promise<FinancialProfileResult> {
  const signals = await collectFinancialProfileSignals();
  return calculateFinancialProfile(signals);
}
