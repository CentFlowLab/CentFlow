import type {
  AnalysisData,
  AnalysisInsight,
  AnalysisMetric,
} from '@/lib/domain/analysis.types';
import type { NetWorthResult } from '@/lib/domain';
import type {
  RawAnalysisInsight,
  RawAnalysisMetric,
  RawAnalysisMetricsPayload,
  RawAnalyticsResponse,
} from '@/lib/types/analysis.api';
import type { RawNetWorthResponse } from '@/lib/types';
import { formatPercent } from '@/lib/utils/format';
import { colors } from '@/lib/theme';

import { mapNetWorth } from './dashboard.mapper';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick<T>(...values: (T | undefined | null)[]): T | undefined {
  return values.find((v) => v !== undefined && v !== null) as T | undefined;
}

function unwrap<T extends object>(payload: T | { data?: T }): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    (payload as { data?: T }).data
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toId(value: string | number | undefined): string {
  return value !== undefined ? String(value) : '';
}

function normalizeInsightType(
  type?: string,
): AnalysisInsight['type'] {
  if (
    type === 'opportunity' ||
    type === 'warning' ||
    type === 'info' ||
    type === 'achievement'
  ) {
    return type;
  }
  return 'info';
}

function normalizeTrend(trend?: string): AnalysisMetric['trend'] {
  if (trend === 'up' || trend === 'down' || trend === 'neutral') return trend;
  return 'neutral';
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function mapAnalysisInsight(raw: RawAnalysisInsight): AnalysisInsight {
  return {
    id: toId(raw.id),
    title: raw.title ?? 'Insight',
    description: raw.description ?? '',
    type: normalizeInsightType(raw.type),
    actionLabel: pick(raw.actionLabel, raw.action_label),
  };
}

function mapAnalysisMetricItem(raw: RawAnalysisMetric): AnalysisMetric {
  const value =
    typeof raw.value === 'number' ? formatPercent(raw.value, 1, false) : (raw.value ?? '—');

  return {
    id: raw.id ?? raw.label ?? 'metric',
    label: raw.label ?? 'Métrica',
    value,
    subtitle: raw.subtitle,
    trend: normalizeTrend(raw.trend),
    icon: {
      ios: raw.icon?.ios ?? 'chart.bar.fill',
      android: raw.icon?.android ?? 'bar_chart',
      web: raw.icon?.web ?? 'bar_chart',
    },
    color: raw.color,
  };
}

/**
 * Calcula métricas derivadas do património quando a API não as envia.
 * Substitui a lógica que estava em analysis.mocks.ts.
 */
export function buildMetricsFromNetWorth(netWorth: NetWorthResult): AnalysisMetric[] {
  const totalAssets = netWorth.totalAssets || 1;
  const investmentShare = (netWorth.breakdown.investments / totalAssets) * 100;
  const liquidityShare = (netWorth.breakdown.accounts / totalAssets) * 100;
  const debtRatio =
    netWorth.totalAssets > 0
      ? (netWorth.totalLiabilities / netWorth.totalAssets) * 100
      : 0;

  return [
    {
      id: 'debt-ratio',
      label: 'Rácio de dívida',
      value: formatPercent(debtRatio, 1, false),
      subtitle: 'passivos / ativos',
      trend: debtRatio > 40 ? 'down' : 'neutral',
      icon: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
      color: debtRatio > 40 ? colors.danger : colors.textSecondary,
    },
    {
      id: 'investment-share',
      label: 'Investido',
      value: formatPercent(investmentShare, 1, false),
      subtitle: 'do património',
      trend: 'up',
      icon: {
        ios: 'chart.line.uptrend.xyaxis',
        android: 'trending_up',
        web: 'trending_up',
      },
      color: colors.primary,
    },
    {
      id: 'liquidity',
      label: 'Liquidez',
      value: formatPercent(liquidityShare, 1, false),
      subtitle: 'em contas',
      trend: 'neutral',
      icon: { ios: 'banknote.fill', android: 'payments', web: 'payments' },
      color: colors.accent,
    },
    {
      id: 'inventory-share',
      label: 'Inventário',
      value: formatPercent((netWorth.breakdown.inventory / totalAssets) * 100, 1, false),
      subtitle: 'do património',
      trend: 'neutral',
      icon: { ios: 'shippingbox.fill', android: 'inventory', web: 'inventory' },
      color: colors.textSecondary,
    },
  ];
}

function mapMetricsPayload(
  payload: RawAnalysisMetricsPayload,
  netWorth: NetWorthResult,
): AnalysisMetric[] {
  const totalAssets = netWorth.totalAssets || 1;
  const debtRatio = toNumber(
    pick(payload.debtRatio, payload.debt_ratio),
    netWorth.totalAssets > 0
      ? (netWorth.totalLiabilities / netWorth.totalAssets) * 100
      : 0,
  );
  const investmentShare = toNumber(
    pick(payload.investmentShare, payload.investment_share),
    (netWorth.breakdown.investments / totalAssets) * 100,
  );
  const liquidityShare = toNumber(
    pick(payload.liquidityShare, payload.liquidity_share),
    (netWorth.breakdown.accounts / totalAssets) * 100,
  );
  const savingsRate = pick(payload.savingsRate, payload.savings_rate);

  const metrics: AnalysisMetric[] = [];

  if (savingsRate !== undefined) {
    metrics.push({
      id: 'savings-rate',
      label: 'Taxa de poupança',
      value: formatPercent(savingsRate, 1, false),
      subtitle: 'este mês',
      trend: savingsRate > 0 ? 'up' : 'neutral',
      icon: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
      color: colors.success,
    });
  }

  metrics.push(
    {
      id: 'debt-ratio',
      label: 'Rácio de dívida',
      value: formatPercent(debtRatio, 1, false),
      subtitle: 'passivos / ativos',
      trend: debtRatio > 40 ? 'down' : 'neutral',
      icon: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
      color: debtRatio > 40 ? colors.danger : colors.textSecondary,
    },
    {
      id: 'investment-share',
      label: 'Investido',
      value: formatPercent(investmentShare, 1, false),
      subtitle: 'do património',
      trend: 'up',
      icon: {
        ios: 'chart.line.uptrend.xyaxis',
        android: 'trending_up',
        web: 'trending_up',
      },
      color: colors.primary,
    },
    {
      id: 'liquidity',
      label: 'Liquidez',
      value: formatPercent(liquidityShare, 1, false),
      subtitle: 'em contas',
      trend: 'neutral',
      icon: { ios: 'banknote.fill', android: 'payments', web: 'payments' },
      color: colors.accent,
    },
  );

  return metrics;
}

function resolveMetrics(
  raw: RawAnalyticsResponse,
  netWorth: NetWorthResult,
): AnalysisMetric[] {
  if (!raw.metrics) {
    return buildMetricsFromNetWorth(netWorth);
  }

  if (Array.isArray(raw.metrics)) {
    return raw.metrics.length > 0
      ? raw.metrics.map(mapAnalysisMetricItem)
      : buildMetricsFromNetWorth(netWorth);
  }

  return mapMetricsPayload(raw.metrics, netWorth);
}

/** Mapeia resposta agregada GET /analytics → AnalysisData */
export function mapAnalyticsResponse(raw: RawAnalyticsResponse): AnalysisData {
  const payload = unwrap(raw);
  const netWorthRaw = (payload.netWorth ?? payload.net_worth ?? payload) as RawNetWorthResponse;
  const netWorth = mapNetWorth(netWorthRaw);

  const insights = (payload.insights ?? []).map(mapAnalysisInsight);

  return {
    netWorth,
    allocation: netWorth.assetsByCategory,
    metrics: resolveMetrics(payload, netWorth),
    insights,
    periodLabel: pick(payload.periodLabel, payload.period_label) ?? 'Últimos 30 dias',
  };
}

/** Compõe AnalysisData a partir de endpoints parciais (fallback 404 em /analytics). */
export function composeAnalysisData(parts: {
  netWorth: RawNetWorthResponse;
  metrics?: RawAnalysisMetric[] | RawAnalysisMetricsPayload | null;
  insights?: RawAnalysisInsight[] | null;
  periodLabel?: string;
}): AnalysisData {
  const netWorth = mapNetWorth(parts.netWorth);

  const metrics = parts.metrics
    ? Array.isArray(parts.metrics)
      ? parts.metrics.map(mapAnalysisMetricItem)
      : mapMetricsPayload(parts.metrics, netWorth)
    : buildMetricsFromNetWorth(netWorth);

  return {
    netWorth,
    allocation: netWorth.assetsByCategory,
    metrics,
    insights: (parts.insights ?? []).map(mapAnalysisInsight),
    periodLabel: parts.periodLabel ?? 'Últimos 30 dias',
  };
}
