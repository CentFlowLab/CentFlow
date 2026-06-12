import type { AssetCategoryBreakdown, NetWorthResult } from './types';

export interface AnalysisMetric {
  id: string;
  label: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: {
    ios: string;
    android: string;
    web: string;
  };
  color?: string;
}

export interface AnalysisInsight {
  id: string;
  title: string;
  description: string;
  type: 'opportunity' | 'warning' | 'info' | 'achievement';
  actionLabel?: string;
}

export interface AnalysisData {
  netWorth: NetWorthResult;
  allocation: AssetCategoryBreakdown[];
  metrics: AnalysisMetric[];
  insights: AnalysisInsight[];
  periodLabel: string;
}
