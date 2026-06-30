import { calculateHealthScore } from './health-score';
import { computeCategoryBreakdown, computeSpendingHeatmap } from './category-breakdown';
import { generateInsights } from './generate-insights';
import { computeMonthlyComparison } from './monthly-comparison';
import { computeMonthSpendingForecast, type MonthSpendingForecast } from './spending-forecast';
import {
  computeSubscriptionAnalysis,
  type SubscriptionAnalysis,
} from './subscription-analysis';
import type { HealthScoreInput, HealthScoreResult, Insight, InsightInput } from './types';
import type { Credit } from '@/lib/domain/types';
import type { Subscription } from '@/lib/domain/assets.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import type { CategoryBreakdownItem } from './category-breakdown';
import { logAppError } from '@/lib/diagnostics';

function emptyHealthScore(): HealthScoreResult {
  const neutral = {
    score: null as number | null,
    max: 20,
    detail: 'Dados indisponíveis.',
    hasData: false,
  };
  return {
    total: 0,
    status: 'critical',
    hasSufficientData: false,
    scoredComponentCount: 0,
    components: {
      savings: { ...neutral, label: 'Poupança' },
      cashflow: { ...neutral, label: 'Fluxo de caixa' },
      debt: { ...neutral, label: 'Dívida' },
      budget: { ...neutral, label: 'Orçamento' },
      subscriptions: { ...neutral, label: 'Subscrições' },
    },
  };
}

export type AnalyticsSnapshot = {
  insights: Insight[];
  healthScore: HealthScoreResult;
  monthlyComparison: ReturnType<typeof computeMonthlyComparison>;
  forecast: MonthSpendingForecast | null;
  categoryBreakdown: CategoryBreakdownItem[];
  heatmap: ReturnType<typeof computeSpendingHeatmap>;
  subscriptionAnalysis: SubscriptionAnalysis | null;
  credits: Credit[];
  monthlyIncome: number;
  monthlyExpenses: number;
};

export function safeGenerateInsights(input: InsightInput): Insight[] {
  try {
    return generateInsights(input);
  } catch (error) {
    logAppError('insights', error);
    return [];
  }
}

export function safeCalculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  try {
    return calculateHealthScore(input);
  } catch (error) {
    logAppError('health-score', error);
    return emptyHealthScore();
  }
}

export function computeAnalyticsSnapshot(params: {
  transactions: Transaction[];
  subscriptions: Subscription[];
  credits: Credit[];
  insightInput: InsightInput;
  healthInput: HealthScoreInput;
  referenceDate: Date;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyBudget: number | null | undefined;
}): AnalyticsSnapshot {
  const {
    transactions,
    subscriptions,
    credits,
    insightInput,
    healthInput,
    referenceDate,
    monthlyIncome,
    monthlyExpenses,
    monthlyBudget,
  } = params;

  const safeTxs = transactions ?? [];
  const safeSubs = subscriptions ?? [];
  const safeCredits = credits ?? [];

  let insights: Insight[] = [];
  let healthScore = emptyHealthScore();
  let monthlyComparison = computeMonthlyComparison([], referenceDate);
  let forecast: MonthSpendingForecast | null = null;
  let categoryBreakdown: CategoryBreakdownItem[] = [];
  let heatmap = computeSpendingHeatmap([], referenceDate);
  let subscriptionAnalysis: SubscriptionAnalysis | null = null;

  try {
    insights = generateInsights(insightInput);
  } catch (error) {
    logAppError('insights', error);
  }

  try {
    healthScore = calculateHealthScore(healthInput);
  } catch (error) {
    logAppError('health-score', error);
  }

  try {
    monthlyComparison = computeMonthlyComparison(safeTxs, referenceDate);
  } catch (error) {
    logAppError('monthly-comparison', error);
  }

  try {
    forecast = computeMonthSpendingForecast(
      safeTxs,
      monthlyIncome,
      monthlyBudget,
      referenceDate,
    );
  } catch (error) {
    logAppError('spending-forecast', error);
  }

  try {
    categoryBreakdown = computeCategoryBreakdown(safeTxs, referenceDate);
  } catch (error) {
    logAppError('category-breakdown', error);
  }

  try {
    heatmap = computeSpendingHeatmap(safeTxs, referenceDate);
  } catch (error) {
    logAppError('spending-heatmap', error);
  }

  try {
    subscriptionAnalysis = computeSubscriptionAnalysis(safeSubs);
  } catch (error) {
    logAppError('subscription-analysis', error);
  }

  return {
    insights,
    healthScore,
    monthlyComparison,
    forecast,
    categoryBreakdown,
    heatmap,
    subscriptionAnalysis,
    credits: safeCredits,
    monthlyIncome,
    monthlyExpenses,
  };
}
