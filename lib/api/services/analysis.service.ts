import { ApiError, apiFetch } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { fetchOptional } from '@/lib/api/fetch-optional';
import {
  composeAnalysisData,
  mapAnalyticsResponse,
} from '@/lib/api/mappers/analysis.mapper';
import { mapNetWorth } from '@/lib/api/mappers/dashboard.mapper';
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

/**
 * Obtém dados de Análises da API.
 *
 * Estratégia (substitui buildMockAnalysisData):
 * 1. GET /analytics — resposta agregada (preferido)
 * 2. Se 404 → compõe: /net-worth + /analytics/metrics + /analytics/insights
 *
 * Invalidação futura: queryClient.invalidateQueries({ queryKey: queryKeys.analytics() })
 */
export async function fetchAnalysisData(): Promise<AnalysisData> {
  try {
    const raw = await apiFetch<RawAnalyticsResponse>(API_ENDPOINTS.analytics);
    return mapAnalyticsResponse(raw);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return fetchAnalysisComposed();
    }
    throw error;
  }
}

/** Fallback quando GET /analytics não existe no backend. */
async function fetchAnalysisComposed(): Promise<AnalysisData> {
  const [netWorth, metrics, insights] = await Promise.all([
    apiFetch<RawNetWorthResponse>(API_ENDPOINTS.netWorth),
    fetchOptional<RawAnalysisMetric[] | RawAnalysisMetricsPayload>(
      API_ENDPOINTS.analyticsMetrics,
    ),
    fetchOptional<RawAnalysisInsight[]>(API_ENDPOINTS.analyticsInsights),
  ]);

  return composeAnalysisData({
    netWorth,
    metrics: metrics ?? undefined,
    insights: insights ?? undefined,
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
