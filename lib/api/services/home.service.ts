import { shouldUseMockData } from '@/lib/config/data-mode';
import { isRealDataOnlyVariant } from '@/lib/config/app-variant';
import { ACCOUNTS_FEATURE_ENABLED } from '@/lib/config/product-features';
import { composeDashboardFromLocalSources } from '@/lib/domain/dashboard.compose';
import { enrichAccountsWithBalances } from '@/lib/domain/financial/accounts';
import { buildMonthlyAvailableBreakdown } from '@/lib/domain/financial/monthly-available.compose';
import {
  buildFinancialSuggestions,
  mapFinancialSuggestionsToHome,
} from '@/lib/domain/financial/suggestions';
import type { HomeScreenData } from '@/lib/domain/home.types';
import type { DashboardData } from '@/lib/domain/types';
import { isSupabaseEnabled, supabaseGoalContributions, supabaseLoanPayments } from '@/lib/supabase';

import { buildMockHomeScreenData, composeHomeScreenData } from '../mock-home';
import { fetchAccountsData } from './accounts.service';
import { fetchAssetsData } from './assets.service';
import { fetchDashboardData } from './dashboard.service';
import { fetchCreditsForCurrentUser } from './liabilities-fetch';
import { fetchTransactions } from './transaction.service';

function attachFinancialSuggestions(
  dashboard: DashboardData,
  input: {
    accounts: Awaited<ReturnType<typeof fetchAccountsData>>;
    transactions: Awaited<ReturnType<typeof fetchTransactions>>;
    goalContributions: Awaited<ReturnType<typeof supabaseGoalContributions.fetchGoalContributions>>;
    loanPayments: Awaited<ReturnType<typeof supabaseLoanPayments.fetchLoanPayments>>;
    credits: Awaited<ReturnType<typeof fetchCreditsForCurrentUser>>;
    subscriptions: Awaited<ReturnType<typeof fetchAssetsData>>['subscriptions'];
  },
) {
  if (!ACCOUNTS_FEATURE_ENABLED) return dashboard;

  const accountsWithBalances = enrichAccountsWithBalances(
    input.accounts,
    input.transactions,
    input.goalContributions,
    input.loanPayments,
  );

  const breakdown = buildMonthlyAvailableBreakdown({
    accounts: input.accounts,
    transactions: input.transactions,
    goalContributions: input.goalContributions,
    credits: input.credits,
    subscriptions: input.subscriptions,
    loanPayments: input.loanPayments,
  });

  const financial = mapFinancialSuggestionsToHome(
    buildFinancialSuggestions({
      accounts: accountsWithBalances,
      credits: input.credits,
      monthlyAvailable: breakdown.available,
    }),
  );

  const seen = new Set<string>();
  const merged = [...financial, ...dashboard.suggestions].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return { ...dashboard, suggestions: merged.slice(0, 3) };
}

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
    const baseDashboard = composeDashboardFromLocalSources({ transactions, assets, credits });
    const dashboard = attachFinancialSuggestions(baseDashboard, {
      accounts,
      transactions,
      goalContributions,
      loanPayments,
      credits,
      subscriptions: assets.subscriptions,
    });
    return composeHomeScreenData(dashboard, assets, transactions, 'live');
  }

  const dashboard = await fetchDashboardData();
  return composeHomeScreenData(dashboard, assets, transactions, 'live');
}
