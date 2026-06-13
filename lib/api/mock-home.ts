import { buildMockDashboard } from '@/lib/data/mocks';
import { fetchMockAssets } from '@/lib/api/mock-assets';
import { fetchMockTransactions } from '@/lib/api/mock-transactions';
import { getGoalsAggregate } from '@/lib/domain/goal.utils';
import type { AssetsData } from '@/lib/domain/assets.types';
import type { HomeAssetsSummary, HomeScreenData } from '@/lib/domain/home.types';
import type { DashboardData } from '@/lib/domain';
import type { Transaction } from '@/lib/domain/transaction.types';

function buildAssetsSummary(assets: AssetsData): HomeAssetsSummary {
  const goalsAggregate = getGoalsAggregate(assets.goals);

  return {
    goalsSaved: goalsAggregate.totalCurrent,
    goalsCount: assets.goals.length,
    warrantiesCount: assets.warranties.length,
    inventoryCount: assets.inventory.length,
  };
}

function pickRecentTransactions(transactions: Transaction[], limit = 5): Transaction[] {
  return [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export function composeHomeScreenData(
  dashboard: DashboardData,
  assets: AssetsData,
  transactions: Transaction[],
  dataSource: HomeScreenData['dataSource'],
): HomeScreenData {
  return {
    ...dashboard,
    dataSource,
    assetsSummary: buildAssetsSummary(assets),
    recentTransactions: pickRecentTransactions(transactions),
  };
}

export async function buildMockHomeScreenData(): Promise<HomeScreenData> {
  const [assets, transactions] = await Promise.all([
    fetchMockAssets(),
    fetchMockTransactions('all'),
  ]);

  return composeHomeScreenData(buildMockDashboard(), assets, transactions, 'mock');
}
