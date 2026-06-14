import type { DashboardData } from './types';
import type { Transaction } from './transaction.types';

export type HomeFeaturedGoal = {
  id: string;
  name: string;
  current: number;
  target: number;
  percent: number;
};

export type HomeAssetsSummary = {
  goalsSaved: number;
  goalsCount: number;
  warrantiesCount: number;
  inventoryCount: number;
};

export type HomeScreenData = DashboardData & {
  dataSource: 'live' | 'mock';
  assetsSummary: HomeAssetsSummary;
  recentTransactions: Transaction[];
  /** Objetivo principal para destaque personalizado no Início */
  featuredGoal: HomeFeaturedGoal | null;
};
