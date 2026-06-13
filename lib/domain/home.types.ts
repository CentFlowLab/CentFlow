import type { DashboardData } from './types';
import type { Transaction } from './transaction.types';

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
};
