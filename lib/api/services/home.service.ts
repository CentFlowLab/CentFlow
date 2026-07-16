import { shouldUseMockData } from '@/lib/config/data-mode';
import { isRealDataOnlyVariant } from '@/lib/config/app-variant';
import { composeDashboardFromLocalSources } from '@/lib/domain/dashboard.compose';
import type { HomeScreenData } from '@/lib/domain/home.types';
import { isSupabaseEnabled, supabaseGoalContributions, supabaseLoanPayments } from '@/lib/supabase';

import { fetchAccountsData } from './accounts.service';
import { buildMockHomeScreenData, composeHomeScreenData } from '../mock-home';
import { fetchAssetsData } from './assets.service';
import { fetchDashboardData } from './dashboard.service';
import { fetchCreditsForCurrentUser } from './liabilities-fetch';
import { fetchTransactions } from './transaction.service';

/**
 * Dados agregados do ecrã Início.
 * Beta/produção: compõe a partir do Supabase (sem API legacy).
 */
export async function fetchHomeScreenData(): Promise<HomeScreenData> {
  if (!isRealDataOnlyVariant() && shouldUseMockData()) {
    return buildMockHomeScreenData();
  }

  const [assets, transactions, credits, goalContributions, loanPayments, accounts] = await Promise.all([
    fetchAssetsData(),
    fetchTransactions('all'),
    fetchCreditsForCurrentUser(),
    isSupabaseEnabled() ? supabaseGoalContributions.fetchGoalContributions() : Promise.resolve([]),
    isSupabaseEnabled() ? supabaseLoanPayments.fetchLoanPayments() : Promise.resolve([]),
    fetchAccountsData(),
  ]);

  if (isSupabaseEnabled()) {
    const dashboard = composeDashboardFromLocalSources({
      transactions,
      assets,
      credits,
      accounts,
      goalContributions,
      loanPayments,
    });
    return composeHomeScreenData(dashboard, assets, transactions, 'live');
  }

  const dashboard = await fetchDashboardData();
  return composeHomeScreenData(dashboard, assets, transactions, 'live');
}
