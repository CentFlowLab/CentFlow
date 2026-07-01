import type { AssetsData } from '@/lib/domain/assets.types';
import type { DashboardData } from '@/lib/domain';
import type {
  AnalysisData,
  AnalysisTrends,
  SpendingCategorySlice,
} from '@/lib/domain/analysis.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import { isTransactionOccurred } from '@/lib/domain/transaction-date.utils';
import { buildMetricsFromNetWorth } from '@/lib/api/mappers/analysis.mapper';
import { formatPercent } from '@/lib/utils/format';
import { colors } from '@/lib/theme';

import { generateAnalysisInsights } from './analysis.insights';

const PERIOD_DAYS = 30;
const SPENDING_CHART_COLORS = [
  colors.primary,
  colors.accent,
  colors.success,
  colors.warning,
  '#8B5CF6',
  '#38BDF8',
  colors.danger,
];

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function isWithinLastDays(date: string, days: number, offsetDays = 0, asOf = new Date()): boolean {
  const target = parseDate(date);
  const end = new Date(asOf);
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() - offsetDays);

  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  return target >= start && target <= end && isTransactionOccurred(date, asOf);
}

function filterTransactionsByWindow(
  transactions: Transaction[],
  days: number,
  offsetDays = 0,
): Transaction[] {
  return transactions.filter((tx) => isWithinLastDays(tx.date, days, offsetDays));
}

export function buildAnalysisTrends(
  transactions: Transaction[],
  dashboard: DashboardData,
  periodDays = PERIOD_DAYS,
): AnalysisTrends {
  const recent = filterTransactionsByWindow(transactions, periodDays);

  const totalIncome = recent
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenses = recent
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const categoryTotals = new Map<string, SpendingCategorySlice>();

  for (const tx of recent) {
    if (tx.type !== 'expense') continue;
    const current = categoryTotals.get(tx.category) ?? {
      key: tx.category,
      label: tx.categoryLabel,
      amount: 0,
    };
    current.amount += tx.amount;
    categoryTotals.set(tx.category, current);
  }

  const spendingByCategory = [...categoryTotals.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  return {
    periodDays,
    totalIncome,
    totalExpenses,
    netCashflow: totalIncome - totalExpenses,
    netWorthChangePercent: dashboard.netWorthChangePercent,
    spendingByCategory,
  };
}

export function buildTrendMetrics(trends: AnalysisTrends): AnalysisData['metrics'] {
  const savingsRate =
    trends.totalIncome > 0
      ? (trends.netCashflow / trends.totalIncome) * 100
      : 0;

  return [
    {
      id: 'cashflow',
      label: 'Fluxo líquido',
      value: formatPercent(trends.netCashflow >= 0 ? savingsRate : Math.abs(savingsRate), 0, false),
      subtitle: `${trends.periodDays} dias`,
      trend: trends.netCashflow >= 0 ? 'up' : 'down',
      icon: { ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' },
      color: trends.netCashflow >= 0 ? colors.success : colors.danger,
    },
    {
      id: 'expenses-30d',
      label: 'Gastos',
      value: formatPercent(
        trends.totalIncome > 0 ? (trends.totalExpenses / trends.totalIncome) * 100 : 0,
        0,
        false,
      ),
      subtitle: 'vs receitas',
      trend: 'neutral',
      icon: { ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' },
      color: colors.warning,
    },
  ];
}

export function getSpendingChartColors(): string[] {
  return SPENDING_CHART_COLORS;
}

export function composeAnalysisFromSources(input: {
  dashboard: DashboardData;
  transactions: Transaction[];
  assets: AssetsData;
  periodDays?: number;
  periodLabel?: string;
}): AnalysisData {
  const { dashboard, transactions, assets } = input;
  const periodDays = input.periodDays ?? PERIOD_DAYS;
  const trends = buildAnalysisTrends(transactions, dashboard, periodDays);
  const baseMetrics = buildMetricsFromNetWorth(dashboard.netWorth);
  const trendMetrics = buildTrendMetrics(trends);

  const savingsMetric =
    trends.totalIncome > 0
      ? [
          {
            id: 'savings-rate',
            label: 'Taxa de poupança',
            value: formatPercent(
              Math.max(0, (trends.netCashflow / trends.totalIncome) * 100),
              1,
              false,
            ),
            subtitle: `últimos ${trends.periodDays} dias`,
            trend: trends.netCashflow >= 0 ? ('up' as const) : ('down' as const),
            icon: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
            color: colors.success,
          },
        ]
      : [];

  const metrics = [...savingsMetric, ...trendMetrics, ...baseMetrics].slice(0, 6);

  const insights = generateAnalysisInsights({
    dashboard,
    transactions,
    assets,
    trends,
  });

  return {
    netWorth: dashboard.netWorth,
    allocation: dashboard.netWorth.assetsByCategory,
    metrics,
    insights,
    trends,
    periodLabel: input.periodLabel ?? `Últimos ${periodDays} dias`,
  };
}

/** Reaplica o período seleccionado aos dados base de análises. */
export function applyAnalysisPeriod(
  base: AnalysisData,
  transactions: Transaction[],
  periodDays: number,
  periodLabel: string,
  assets?: AssetsData,
): AnalysisData {
  const dashboardStub = {
    netWorth: base.netWorth,
    netWorthChangePercent: base.trends.netWorthChangePercent,
  } as DashboardData;

  const trends = buildAnalysisTrends(transactions, dashboardStub, periodDays);
  const trendMetrics = buildTrendMetrics(trends);

  const savingsMetric =
    trends.totalIncome > 0
      ? [
          {
            id: 'savings-rate',
            label: 'Taxa de poupança',
            value: formatPercent(
              Math.max(0, (trends.netCashflow / trends.totalIncome) * 100),
              1,
              false,
            ),
            subtitle: periodLabel,
            trend: trends.netCashflow >= 0 ? ('up' as const) : ('down' as const),
            icon: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
            color: colors.success,
          },
        ]
      : [];

  const patrimonyMetrics = base.metrics.filter((metric) =>
    ['debt-ratio', 'investment-share', 'liquidity', 'inventory-share'].includes(metric.id),
  );

  const insights = assets
    ? generateAnalysisInsights({
        dashboard: dashboardStub,
        transactions,
        assets,
        trends,
      })
    : base.insights;

  return {
    ...base,
    trends,
    metrics: [...savingsMetric, ...trendMetrics, ...patrimonyMetrics].slice(0, 6),
    insights,
    periodLabel,
  };
}
