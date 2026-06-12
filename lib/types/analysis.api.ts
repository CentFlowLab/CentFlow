import type { RawNetWorthResponse } from './dashboard.api';

/** Métricas numéricas brutas da API de Análises */
export interface RawAnalysisMetricsPayload {
  savings_rate?: number;
  savingsRate?: number;
  debt_ratio?: number;
  debtRatio?: number;
  investment_share?: number;
  investmentShare?: number;
  liquidity_share?: number;
  liquidityShare?: number;
  personal_inflation?: number | null;
  personalInflation?: number | null;
}

/** Métrica formatada vinda da API */
export interface RawAnalysisMetric {
  id?: string;
  label?: string;
  value?: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral' | string;
  icon?: { ios?: string; android?: string; web?: string };
  color?: string;
}

export interface RawAnalysisInsight {
  id?: string | number;
  title?: string;
  description?: string;
  type?: 'opportunity' | 'warning' | 'info' | 'achievement' | string;
  action_label?: string;
  actionLabel?: string;
}

/** Resposta agregada GET /analytics */
export interface RawAnalyticsResponse {
  net_worth?: RawNetWorthResponse;
  netWorth?: RawNetWorthResponse;
  metrics?: RawAnalysisMetric[] | RawAnalysisMetricsPayload;
  insights?: RawAnalysisInsight[];
  period_label?: string;
  periodLabel?: string;
  data?: RawAnalyticsResponse;
}
