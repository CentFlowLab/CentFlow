import { calculateNetWorth, sumGoalSavings } from './net-worth.service';
import type { AssetsData } from './assets.types';
import type { DashboardData } from './types';
import type { Transaction } from './transaction.types';
import type { Credit } from './types';

function sumWeeklyExpenses(transactions: Transaction[]): number {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return transactions
    .filter((tx) => tx.type === 'expense' && new Date(tx.date).getTime() >= weekAgo)
    .reduce((sum, tx) => sum + tx.amount, 0);
}

function estimateCashBalance(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => {
    return tx.type === 'income' ? sum + tx.amount : sum - tx.amount;
  }, 0);
}

/** Dashboard mínimo a partir de dados Supabase (sem API legacy). */
export function composeDashboardFromLocalSources(input: {
  transactions: Transaction[];
  assets: AssetsData;
  credits?: Credit[];
}): DashboardData {
  const cashBalance = estimateCashBalance(input.transactions);
  const goalSavings = sumGoalSavings(input.assets.goals);
  const credits = input.credits ?? [];

  const netWorth = calculateNetWorth({
    accounts: [
      {
        id: 'derived-cash',
        name: 'Saldo estimado',
        balance: cashBalance,
        currency: 'EUR',
      },
    ],
    inventory: input.assets.inventory,
    investments: [],
    savings: goalSavings,
    credits,
  });

  return {
    netWorth,
    previousMonthNetWorth: netWorth.netWorth,
    netWorthChangePercent: 0,
    weeklySpending: sumWeeklyExpenses(input.transactions),
    netWorthChangeThisMonth: 0,
    personalInflation: null,
    attentionItems: [],
    suggestions: [],
  };
}
