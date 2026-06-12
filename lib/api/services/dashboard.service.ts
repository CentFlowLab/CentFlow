import { ApiError, apiFetch } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { fetchOptional } from '@/lib/api/fetch-optional';
import {
  composeDashboardData,
  mapDashboardResponse,
  mapNetWorth,
} from '@/lib/api/mappers/dashboard.mapper';
import type { DashboardData } from '@/lib/domain';
import type {
  RawAttentionItem,
  RawDashboardMetrics,
  RawDashboardResponse,
  RawNetWorthResponse,
  RawSuggestion,
  RawTransactionsSummary,
} from '@/lib/types';

/**
 * Obtém dados do Dashboard.
 *
 * Estratégia:
 * 1. Tenta GET /dashboard (resposta agregada — preferido)
 * 2. Se 404, compõe a partir de /net-worth + endpoints parciais
 *
 * Substituído: buildMockDashboard() — mocks removidos deste fluxo.
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const raw = await apiFetch<RawDashboardResponse>(API_ENDPOINTS.dashboard);
    return mapDashboardResponse(raw);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return fetchDashboardComposed();
    }
    throw error;
  }
}

/** Fallback: vários endpoints quando /dashboard não existe. */
async function fetchDashboardComposed(): Promise<DashboardData> {
  const [netWorth, metrics, attention, suggestions, transactionsSummary] =
    await Promise.all([
      apiFetch<RawNetWorthResponse>(API_ENDPOINTS.netWorth),
      fetchOptional<RawDashboardMetrics>(API_ENDPOINTS.dashboardMetrics),
      fetchOptional<RawAttentionItem[]>(API_ENDPOINTS.dashboardAttention),
      fetchOptional<RawSuggestion[]>(API_ENDPOINTS.dashboardSuggestions),
      fetchOptional<RawTransactionsSummary>(API_ENDPOINTS.transactionsSummary),
    ]);

  return composeDashboardData({
    netWorth,
    metrics: metrics ?? undefined,
    attention: attention ?? undefined,
    suggestions: suggestions ?? undefined,
    transactionsSummary: transactionsSummary ?? undefined,
  });
}

/** Obtém apenas património — útil para invalidação granular. */
export async function fetchNetWorthData(): Promise<DashboardData['netWorth']> {
  try {
    const raw = await apiFetch<RawNetWorthResponse>(API_ENDPOINTS.netWorth);
    return mapNetWorth(raw);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const dashboard = await apiFetch<RawDashboardResponse>(API_ENDPOINTS.dashboard);
      const mapped = mapDashboardResponse(dashboard);
      return mapped.netWorth;
    }
    throw error;
  }
}
