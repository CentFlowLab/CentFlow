import { shouldUseMockData } from '@/lib/config/data-mode';
import { isRealDataOnlyVariant } from '@/lib/config/app-variant';
import { ACCOUNTS_FEATURE_ENABLED } from '@/lib/config/product-features';
import { composeDashboardFromLocalSources } from '@/lib/domain/dashboard.compose';
import type { HomeScreenData } from '@/lib/domain/home.types';
import { isSupabaseEnabled, supabaseGoalContributions, supabaseLoanPayments } from '@/lib/supabase';

import { buildMockHomeScreenData, composeHomeScreenData } from '../mock-home';
import { fetchAccountsData } from './accounts.service';
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

  const [assets, transactions, credits, accounts, goalContributions, loanPayments] =
    await Promise.all([
      fetchAssetsData(),
      fetchTransactions('all'),
      fetchCreditsForCurrentUser(),
      fetchAccountsData(),
      ACCOUNTS_FEATURE_ENABLED && isSupabaseEnabled()
        ? supabaseGoalContributions.fetchGoalContributions()
        : Promise.resolve([]),
      ACCOUNTS_FEATURE_ENABLED && isSupabaseEnabled()
        ? supabaseLoanPayments.fetchLoanPayments()
        : Promise.resolve([]),
    ]);

  if (isSupabaseEnabled()) {
    const dashboard = composeDashboardFromLocalSources({
      transactions,
      assets,
      credits,
      accounts: ACCOUNTS_FEATURE_ENABLED ? accounts : undefined,
      goalContributions: ACCOUNTS_FEATURE_ENABLED ? goalContributions : undefined,
      loanPayments: ACCOUNTS_FEATURE_ENABLED ? loanPayments : undefined,
    });
    return composeHomeScreenData(dashboard, assets, transactions, 'live');
  }

  const dashboard = await fetchDashboardData();
  return composeHomeScreenData(dashboard, assets, transactions, 'live');
}
