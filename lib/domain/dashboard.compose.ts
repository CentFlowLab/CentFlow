import type { AssetsData } from './assets.types';
import type { DashboardData } from './types';
import type { Transaction } from './transaction.types';
import type { Credit } from './types';
import {
  calculateFinancialState,
  financialStateToDashboard,
} from '@/lib/domain/financial/financial-state';

/** Dashboard mínimo a partir de dados Supabase (sem API legacy). */
export function composeDashboardFromLocalSources(input: {
  transactions: Transaction[];
  assets: AssetsData;
  credits?: Credit[];
  accounts?: Parameters<typeof calculateFinancialState>[0]['accounts'];
  goalContributions?: Parameters<typeof calculateFinancialState>[0]['goalContributions'];
  loanPayments?: Parameters<typeof calculateFinancialState>[0]['loanPayments'];
  /** Data de referência — útil em testes; omissão = hoje. */
  asOf?: Date;
}): DashboardData {
  const state = calculateFinancialState({
    transactions: input.transactions,
    accounts: input.accounts,
    credits: input.credits ?? input.assets.credits,
    goals: input.assets.goals,
    goalContributions: input.goalContributions,
    subscriptions: input.assets.subscriptions,
    inventory: input.assets.inventory,
    loanPayments: input.loanPayments,
    today: input.asOf,
  });

  return financialStateToDashboard(state);
}
