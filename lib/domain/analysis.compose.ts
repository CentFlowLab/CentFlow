import type { AssetsData } from '@/lib/domain/assets.types';
import type { DashboardData } from '@/lib/domain';
import type {
  AnalysisData,
  AnalysisTrends,
  SpendingCategorySlice,
} from '@/lib/domain/analysis.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import {
  getExpenseTotal,
  getIncomeTotal,
  getNetCashflow,
  groupTransactionsByCategory,
} from '@/lib/domain/financial/transactions';
import { calculateSavingsRate } from '@/lib/domain/financial/savings';
import { buildMetricsFromNetWorth } from '@/lib/api/mappers/analysis.mapper';
import { formatCurrency, formatPercent } from '@/lib/utils/format';
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

function periodForDays(days: number, offsetDays = 0, asOf = new Date()) {
  return { kind: 'rolling' as const, days, offsetDays, asOf };
}

export function buildAnalysisTrends(
  transactions: Transaction[],
  dashboard: DashboardData,
  periodDays = PERIOD_DAYS,
): AnalysisTrends {
  const period = periodForDays(periodDays);
  const totalIncome = getIncomeTotal(transactions, period);
  const totalExpenses = getExpenseTotal(transactions, period);
  const spendingByCategory: SpendingCategorySlice[] = groupTransactionsByCategory(
    transactions,
    period,
  ).slice(0, 6);

  return {
    periodDays,
    totalIncome,
    totalExpenses,
    netCashflow: getNetCashflow(transactions, period),
    netWorthChangePercent: dashboard.netWorthChangePercent,
    spendingByCategory,
  };
}

export function buildTrendMetrics(trends: AnalysisTrends): AnalysisData['metrics'] {
  const savings = calculateSavingsRate(trends.totalIncome, trends.totalExpenses);

  return [
    {
      id: 'cashflow',
      label: 'Fluxo líquido',
      value: formatCurrency(trends.netCashflow),
      subtitle: `${trends.periodDays} dias`,
      trend: trends.netCashflow >= 0 ? 'up' : 'down',
      icon: { ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' },
      color: trends.netCashflow >= 0 ? colors.success : colors.danger,
    },
    {
      id: 'expenses-30d',
      label: 'Rácio de gasto',
      value: formatPercent(
        savings.income > 0 ? (savings.expenses / savings.income) * 100 : 0,
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

  const savings = calculateSavingsRate(trends.totalIncome, trends.totalExpenses);
  const savingsMetric =
    savings.rate !== null
      ? [
          {
            id: 'savings-rate',
            label: 'Taxa de poupança',
            value: formatPercent(savings.rate, 1, false),
            subtitle: `últimos ${trends.periodDays} dias`,
            trend: savings.rate >= 0 ? ('up' as const) : ('down' as const),
            icon: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
            color: savings.rate >= 0 ? colors.success : colors.danger,
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

  const savings = calculateSavingsRate(trends.totalIncome, trends.totalExpenses);
  const savingsMetric =
    savings.rate !== null
      ? [
          {
            id: 'savings-rate',
            label: 'Taxa de poupança',
            value: formatPercent(savings.rate, 1, false),
            subtitle: periodLabel,
            trend: savings.rate >= 0 ? ('up' as const) : ('down' as const),
            icon: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
            color: savings.rate >= 0 ? colors.success : colors.danger,
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
