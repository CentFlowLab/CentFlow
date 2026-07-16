import { analyzeCredit } from '@/lib/credit/credit-analysis';
import { detectSubscriptionsFromTransactions } from '@/lib/subscriptions/detect-subscriptions';
import { countRenewalsSoon } from '@/lib/subscriptions/renewal.utils';

import { calculateCategoryBudgetStatus } from './category-budgets';
import {
  buildCashflowProjection,
  CASHFLOW_PROJECTION_HORIZONS,
  type CashflowProjectionHorizon,
} from './cashflow-projection';
import { coreStateToEngineNetWorth, coreStateToHomeSummary } from './engine.core';
import type { FinancialEngineContext, FinancialEngineStepRunner } from './engine.types';

export const recalculateLiabilities: FinancialEngineStepRunner = (ctx) => {
  const summary = ctx.coreState.creditSummary;
  ctx.results.liabilities = {
    totalDebt: summary.totalDebt,
    monthlyPayments: summary.monthlyPayments,
  };
};

export const recalculateSubscriptions: FinancialEngineStepRunner = (ctx) => {
  const detected = detectSubscriptionsFromTransactions(
    ctx.input.transactions,
    ctx.input.subscriptions,
    ctx.input.dismissedSubscriptionIds,
  );
  const sub = ctx.coreState.subscriptions;

  ctx.results.subscriptions = {
    detected,
    monthlyTotal: sub.monthlyTotal,
    renewingSoon: sub.renewingSoon,
  };
};

export const recalculateCreditState: FinancialEngineStepRunner = (ctx) => {
  const analyses = ctx.input.credits.map((credit) => ({
    creditId: credit.id,
    analysis: analyzeCredit({
      outstandingBalance: credit.outstandingBalance,
      originalAmount: credit.originalAmount,
      interestRateAnnual: credit.interestRateAnnual,
      indexRate: credit.indexRate,
      spread: credit.spread,
      termMonths: credit.termMonths,
      monthlyPayment: credit.monthlyPayment,
      insuranceMonthly: credit.insuranceMonthly,
      nextPaymentAmount: credit.nextPaymentAmount,
      monthlyIncome: credit.monthlyIncome,
    }),
  }));

  const summary = ctx.coreState.creditSummary;
  ctx.results.creditState = {
    analyses,
    totalDebt: summary.totalDebt,
    monthlyPayments: summary.monthlyPayments,
    cardCount: summary.cardCount,
    loanCount: summary.loanCount,
  };
};

export const recalculateCategoryBudgets: FinancialEngineStepRunner = (ctx) => {
  ctx.results.categoryBudgets = calculateCategoryBudgetStatus(
    ctx.input.categoryBudgets,
    ctx.input.transactions,
    ctx.asOf,
  );
};

/** @deprecated Wrapper — orçamento lido de coreState; buildMonthlyAvailableBreakdown não é invocado aqui. */
export const recalculateBudget: FinancialEngineStepRunner = (ctx) => {
  ctx.results.budget = ctx.coreState.budget;
};

export const recalculateNetWorth: FinancialEngineStepRunner = (ctx) => {
  ctx.results.netWorth = coreStateToEngineNetWorth(ctx.coreState);
};

export const recalculateCashflowProjection: FinancialEngineStepRunner = (ctx) => {
  const horizon: CashflowProjectionHorizon = CASHFLOW_PROJECTION_HORIZONS[0];

  ctx.results.cashflowProjection = buildCashflowProjection({
    transactions: ctx.input.transactions,
    subscriptions: ctx.input.subscriptions,
    credits: ctx.input.credits,
    goalContributions: ctx.input.goalContributions,
    loanPayments: ctx.input.loanPayments,
    prioritizeDebtAmortization: ctx.input.prioritizeDebtAmortization,
    horizon,
    asOf: ctx.asOf,
  });
};

export const recalculateHealthScore: FinancialEngineStepRunner = (ctx) => {
  ctx.results.healthScore = ctx.coreState.healthScore;
};

export const recalculateHomeSummary: FinancialEngineStepRunner = (ctx) => {
  ctx.results.homeSummary = coreStateToHomeSummary(
    ctx.coreState,
    ctx.input.transactions.length > 0,
  );
};

export const recalculateRecommendations: FinancialEngineStepRunner = async (ctx) => {
  const [
    { readRecommendationFiredRecords, writeRecommendationFiredRecords },
    { loadIgnoredSpendingHabits },
    { generateRecommendations, mergeRecommendationFiredRecords },
  ] = await Promise.all([
    import('@/lib/storage/recommendation-fired.storage'),
    import('@/lib/storage/ignored-habits.storage'),
    import('./recommendations'),
  ]);

  const [lastFired, ignoredHabitIds] = await Promise.all([
    readRecommendationFiredRecords(ctx.userId),
    loadIgnoredSpendingHabits(ctx.userId),
  ]);

  const recommendations = generateRecommendations(ctx.coreState, {
    transactions: ctx.input.transactions,
    settings: ctx.input.recommendationRules,
    lastFired,
    asOf: ctx.asOf,
    prioritizeDebtAmortization: ctx.input.prioritizeDebtAmortization,
    categoryMedianThreshold: ctx.input.categorySpendAlertThreshold,
    ignoredHabitIds,
  });

  const merged = mergeRecommendationFiredRecords(recommendations, lastFired, ctx.asOf);
  await writeRecommendationFiredRecords(ctx.userId, merged);
  ctx.results.recommendations = recommendations;
};

export const DEFAULT_FINANCIAL_ENGINE_STEP_RUNNERS: Record<
  import('./engine.types').FinancialEngineStepId,
  FinancialEngineStepRunner
> = {
  liabilities: recalculateLiabilities,
  subscriptions: recalculateSubscriptions,
  creditState: recalculateCreditState,
  categoryBudgets: recalculateCategoryBudgets,
  budget: recalculateBudget,
  netWorth: recalculateNetWorth,
  cashflowProjection: recalculateCashflowProjection,
  healthScore: recalculateHealthScore,
  homeSummary: recalculateHomeSummary,
  recommendations: recalculateRecommendations,
};
