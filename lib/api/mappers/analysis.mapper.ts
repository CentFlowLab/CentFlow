import type {
  AnalysisData,
  AnalysisInsight,
  AnalysisMetric,
  AnalysisTrends,
} from '@/lib/domain/analysis.types';
import type { NetWorthResult } from '@/lib/domain';
import type {
  RawAnalysisInsight,
  RawAnalysisMetric,
  RawAnalysisMetricsPayload,
  RawAnalyticsResponse,
} from '@/lib/types/analysis.api';
import type { RawNetWorthResponse } from '@/lib/types';
import { formatMissingMetricLabel, safePercentage } from '@/lib/domain/financial/safe-math';
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

function emptyTrends(netWorthChangePercent = 0): AnalysisTrends {
  return {
    periodDays: 30,
    totalIncome: 0,
    totalExpenses: 0,
    netCashflow: 0,
    netWorthChangePercent,
    spendingByCategory: [],
  };
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
function ratioMetric(
  id: string,
  label: string,
  numerator: number,
  denominator: number,
  subtitleWhenOk: string,
  icons: AnalysisMetric['icon'],
  colorWhenOk: string,
): AnalysisMetric {
  const pct = safePercentage(numerator, denominator);
  if (pct == null) {
    return {
      id,
      label,
      value: formatMissingMetricLabel('not_calculable'),
      subtitle: 'Requer ativos positivos',
      trend: 'neutral',
      icon: icons,
      color: colors.textMuted,
    };
  }
  return {
    id,
    label,
    value: formatPercent(pct, 1, false),
    subtitle: subtitleWhenOk,
    trend: id === 'debt-ratio' && pct > 40 ? 'down' : 'neutral',
    icon: icons,
    color: id === 'debt-ratio' && pct > 40 ? colors.danger : colorWhenOk,
  };
}

export function buildMetricsFromNetWorth(netWorth: NetWorthResult): AnalysisMetric[] {
  const assetsBase = netWorth.totalAssets;

  return [
    ratioMetric(
      'debt-ratio',
      'Rácio de dívida',
      netWorth.totalLiabilities,
      assetsBase,
      'passivos / ativos',
      { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
      colors.textSecondary,
    ),
    ratioMetric(
      'investment-share',
      'Investido',
      netWorth.breakdown.investments,
      assetsBase,
      'dos ativos',
      { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' },
      colors.primary,
    ),
    ratioMetric(
      'liquidity',
      'Liquidez',
      Math.max(0, netWorth.breakdown.accounts),
      assetsBase,
      'em contas',
      { ios: 'banknote.fill', android: 'payments', web: 'payments' },
      colors.accent,
    ),
    ratioMetric(
      'inventory-share',
      'Inventário',
      netWorth.breakdown.inventory,
      assetsBase,
      'dos ativos',
      { ios: 'shippingbox.fill', android: 'inventory', web: 'inventory' },
      colors.textSecondary,
    ),
  ];
}

function mapMetricsPayload(
  payload: RawAnalysisMetricsPayload,
  netWorth: NetWorthResult,
): AnalysisMetric[] {
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

  metrics.push(...buildMetricsFromNetWorth(netWorth));
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
    trends: emptyTrends(),
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
    trends: emptyTrends(),
    periodLabel: parts.periodLabel ?? 'Últimos 30 dias',
  };
}
