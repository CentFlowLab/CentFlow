import { buildMockDashboard } from '@/lib/data/mocks';
import { fetchMockAssets } from '@/lib/api/mock-assets';
import { fetchMockTransactions } from '@/lib/api/mock-transactions';
import { getGoalsAggregate, getGoalProgress, pickFeaturedGoal } from '@/lib/domain/goal.utils';
import type { AssetsData } from '@/lib/domain/assets.types';
import type { HomeAssetsSummary, HomeScreenData } from '@/lib/domain/home.types';
import type { DashboardData } from '@/lib/domain';
import type { Transaction } from '@/lib/domain/transaction.types';

function buildFeaturedGoal(assets: AssetsData): HomeScreenData['featuredGoal'] {
  const goal = pickFeaturedGoal(assets.goals);
  if (!goal) return null;

  const progress = getGoalProgress(goal);
  return {
    id: goal.id,
    name: goal.name,
    current: goal.current,
    target: goal.target,
    percent: progress.percent,
  };
}

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
    featuredGoal: buildFeaturedGoal(assets),
  };
}

export async function buildMockHomeScreenData(): Promise<HomeScreenData> {
  const [assets, transactions] = await Promise.all([
    fetchMockAssets(),
    fetchMockTransactions('all'),
  ]);

  return composeHomeScreenData(buildMockDashboard(), assets, transactions, 'mock');
}
