import { shouldUseMockData } from '@/lib/config/data-mode';
import type { HomeScreenData } from '@/lib/domain/home.types';

import { buildMockHomeScreenData, composeHomeScreenData } from '../mock-home';
import { fetchAssetsData } from './assets.service';
import { fetchDashboardData } from './dashboard.service';
import { fetchTransactions } from './transaction.service';

/**
 * Dados agregados do ecrã Início.
 * Usa mock quando configurado ou quando a API falha.
 */
export async function fetchHomeScreenData(): Promise<HomeScreenData> {
  if (shouldUseMockData()) {
    return buildMockHomeScreenData();
  }

  const [dashboard, assets, transactions] = await Promise.all([
    fetchDashboardData(),
    fetchAssetsData(),
    fetchTransactions('all'),
  ]);

  return composeHomeScreenData(dashboard, assets, transactions, 'live');
}
