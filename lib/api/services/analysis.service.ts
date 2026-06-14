import { ApiError, apiFetch } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { fetchOptional } from '@/lib/api/fetch-optional';
import {
  composeAnalysisData,
  mapAnalyticsResponse,
} from '@/lib/api/mappers/analysis.mapper';
import { mapNetWorth } from '@/lib/api/mappers/dashboard.mapper';
import { fetchAssetsData } from '@/lib/api/services/assets.service';
import { fetchDashboardData } from '@/lib/api/services/dashboard.service';
import { fetchTransactions } from '@/lib/api/services/transaction.service';
import { shouldUseMockData } from '@/lib/config/data-mode';
import { buildMockDashboard } from '@/lib/data/mocks';
import { buildMockAnalysisData } from '@/lib/data/analysis.mocks';
import { composeAnalysisFromSources } from '@/lib/domain/analysis.compose';
import type { AnalysisData } from '@/lib/domain/analysis.types';
import type {
  RawAnalysisInsight,
  RawAnalysisMetric,
  RawAnalysisMetricsPayload,
  RawAnalyticsResponse,
} from '@/lib/types/analysis.api';
import type { RawNetWorthResponse } from '@/lib/types';

export type PatrimonyAllocationData = {
  allocation: AnalysisData['allocation'];
  totalAssets: number;
  netWorth: number;
};

async function fetchLocalAnalysisData(): Promise<AnalysisData> {
  const [dashboard, transactions, assets] = await Promise.all([
    fetchDashboardData().catch(() => buildMockDashboard()),
    fetchTransactions('all'),
    fetchAssetsData(),
  ]);

  return composeAnalysisFromSources({ dashboard, transactions, assets });
}

/**
 * Obtém dados de Análises.
 *
 * Estratégia:
 * 1. Mock / offline → compõe a partir de dashboard + transações + ativos locais
 * 2. GET /analytics — resposta agregada (preferido)
 * 3. Fallback API parcial ou erro → composição local
 */
export async function fetchAnalysisData(): Promise<AnalysisData> {
  if (shouldUseMockData()) {
    try {
      return await fetchLocalAnalysisData();
    } catch {
      return buildMockAnalysisData();
    }
  }

  try {
    const raw = await apiFetch<RawAnalyticsResponse>(API_ENDPOINTS.analytics);
    const mapped = mapAnalyticsResponse(raw);

    try {
      const [dashboard, transactions, assets] = await Promise.all([
        fetchDashboardData(),
        fetchTransactions('all'),
        fetchAssetsData(),
      ]);
      return composeAnalysisFromSources({
        dashboard,
        transactions,
        assets,
        periodLabel: mapped.periodLabel,
      });
    } catch {
      return mapped;
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      try {
        return await fetchAnalysisComposed();
      } catch {
        return fetchLocalAnalysisData();
      }
    }

    try {
      return await fetchLocalAnalysisData();
    } catch {
      return buildMockAnalysisData();
    }
  }
}

/** Fallback quando GET /analytics não existe no backend. */
async function fetchAnalysisComposed(): Promise<AnalysisData> {
  const [netWorth, metrics, insights, transactions, assets] = await Promise.all([
    apiFetch<RawNetWorthResponse>(API_ENDPOINTS.netWorth),
    fetchOptional<RawAnalysisMetric[] | RawAnalysisMetricsPayload>(
      API_ENDPOINTS.analyticsMetrics,
    ),
    fetchOptional<RawAnalysisInsight[]>(API_ENDPOINTS.analyticsInsights),
    fetchTransactions('all').catch(() => [] as Awaited<ReturnType<typeof fetchTransactions>>),
    fetchAssetsData(),
  ]);

  const composed = composeAnalysisData({
    netWorth,
    metrics: metrics ?? undefined,
    insights: insights ?? undefined,
  });

  const dashboard = {
    netWorth: composed.netWorth,
    previousMonthNetWorth: 0,
    netWorthChangePercent: 0,
    weeklySpending: 0,
    netWorthChangeThisMonth: 0,
    personalInflation: null,
    attentionItems: [],
    suggestions: [],
  };

  return composeAnalysisFromSources({
    dashboard,
    transactions,
    assets,
    periodLabel: composed.periodLabel,
  });
}

/**
 * Património / alocação — endpoint dedicado para invalidação granular.
 * Tenta GET /net-worth; fallback para GET /analytics.
 */
export async function fetchPatrimonyAllocation(): Promise<PatrimonyAllocationData> {
  try {
    const raw = await apiFetch<RawNetWorthResponse>(API_ENDPOINTS.netWorth);
    const netWorth = mapNetWorth(raw);
    return {
      allocation: netWorth.assetsByCategory,
      totalAssets: netWorth.totalAssets,
      netWorth: netWorth.netWorth,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const analysis = await fetchAnalysisData();
      return {
        allocation: analysis.allocation,
        totalAssets: analysis.netWorth.totalAssets,
        netWorth: analysis.netWorth.netWorth,
      };
    }
    throw error;
  }
}
