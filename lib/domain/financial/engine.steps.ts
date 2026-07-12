import { analyzeCredit } from '@/lib/credit/credit-analysis';
import { detectSubscriptionsFromTransactions } from '@/lib/subscriptions/detect-subscriptions';
import { countRenewalsSoon } from '@/lib/subscriptions/renewal.utils';
import { calculateMonthlyNetWorthMetrics } from '@/lib/domain/net-worth-monthly';
import { getSmartSummaryMessage } from '@/lib/home/smart-summary';

import { buildMonthlyAvailableBreakdown } from './monthly-available.compose';
import { calculateCategoryBudgetStatus } from './category-budgets';
import {
  buildCashflowProjection,
  CASHFLOW_PROJECTION_HORIZONS,
  type CashflowProjectionHorizon,
} from './cashflow-projection';
import { calculateCentFlowScore, monthlySubscriptionTotal } from './centflow-score';
import { calculateGoalProgress } from './goals';
import { sumCreditLiabilities, sumMonthlyDebtPayments } from './liabilities';
import { buildCashFlowState, summarizeCreditExposure } from './metrics';
import { calculateNetWorth } from './netWorth';
import { sumGlobalCashBalance, getExpenseTotal } from './transactions';
import type { FinancialEngineContext, FinancialEngineStepRunner } from './engine.types';

function resolveNetWorthFromContext(ctx: FinancialEngineContext) {
  const { input, asOf } = ctx;
  const occurredCash = sumGlobalCashBalance(input.transactions, {
    goalContributions: input.goalContributions,
    loanPayments: input.loanPayments,
    scope: 'occurred',
    asOf,
  });

  return calculateNetWorth({
    accounts:
      occurredCash !== 0
        ? [
            {
              id: 'global-cash',
              name: 'Saldo',
              balance: occurredCash,
              currency: 'EUR',
            },
          ]
        : [],
    inventory: input.inventory,
    investments: [],
    savings: 0,
    credits: input.credits,
  });
}

export const recalculateLiabilities: FinancialEngineStepRunner = (ctx) => {
  const totalDebt = sumCreditLiabilities(ctx.input.credits);
  const monthlyPayments = sumMonthlyDebtPayments(ctx.input.credits);
  ctx.results.liabilities = { totalDebt, monthlyPayments };
};

export const recalculateSubscriptions: FinancialEngineStepRunner = (ctx) => {
  const detected = detectSubscriptionsFromTransactions(
    ctx.input.transactions,
    ctx.input.subscriptions,
    ctx.input.dismissedSubscriptionIds,
  );
  const monthlyTotal = monthlySubscriptionTotal(ctx.input.subscriptions);
  const renewingSoon = countRenewalsSoon(ctx.input.subscriptions, ctx.asOf);

  ctx.results.subscriptions = {
    detected,
    monthlyTotal,
    renewingSoon,
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

  const summary = summarizeCreditExposure(ctx.input.credits);
  ctx.results.creditState = {
    analyses,
    ...summary,
  };
};

export const recalculateCategoryBudgets: FinancialEngineStepRunner = (ctx) => {
  ctx.results.categoryBudgets = calculateCategoryBudgetStatus(
    ctx.input.categoryBudgets,
    ctx.input.transactions,
    ctx.asOf,
  );
};

export const recalculateBudget: FinancialEngineStepRunner = (ctx) => {
  ctx.results.budget = buildMonthlyAvailableBreakdown({
    accounts: ctx.input.accounts,
    transactions: ctx.input.transactions,
    goalContributions: ctx.input.goalContributions,
    credits: ctx.input.credits,
    subscriptions: ctx.input.subscriptions,
    loanPayments: ctx.input.loanPayments,
    referenceDate: ctx.asOf,
  });
};

export const recalculateNetWorth: FinancialEngineStepRunner = (ctx) => {
  const netWorth = resolveNetWorthFromContext(ctx);
  const monthlyMetrics = calculateMonthlyNetWorthMetrics(
    ctx.input.transactions,
    {
      inventory: ctx.input.inventory,
      investments: [],
      credits: ctx.input.credits,
      savings: 0,
    },
    netWorth.netWorth,
    ctx.asOf,
  );

  ctx.results.netWorth = {
    ...netWorth,
    changePercent: monthlyMetrics.netWorthChangePercent,
    monthlyChange: monthlyMetrics.netWorthChangeThisMonth,
  };
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
  const weeklySpending = getExpenseTotal(ctx.input.transactions, {
    kind: 'rolling',
    days: 7,
    asOf: ctx.asOf,
  });
  const cashFlow = buildCashFlowState(ctx.input.transactions, weeklySpending, ctx.asOf);
  const netWorth = ctx.results.netWorth ?? resolveNetWorthFromContext(ctx);
  const netWorthMetrics =
    ctx.results.netWorth ??
    (() => {
      const monthly = calculateMonthlyNetWorthMetrics(
        ctx.input.transactions,
        {
          inventory: ctx.input.inventory,
          investments: [],
          credits: ctx.input.credits,
          savings: 0,
        },
        netWorth.netWorth,
        ctx.asOf,
      );
      return {
        ...netWorth,
        changePercent: monthly.netWorthChangePercent,
        monthlyChange: monthly.netWorthChangeThisMonth,
      };
    })();

  const creditSummary =
    ctx.results.creditState ?? summarizeCreditExposure(ctx.input.credits);
  const subMonthlyTotal =
    ctx.results.subscriptions?.monthlyTotal ??
    monthlySubscriptionTotal(ctx.input.subscriptions);
  const renewingSoon =
    ctx.results.subscriptions?.renewingSoon ??
    countRenewalsSoon(ctx.input.subscriptions, ctx.asOf);

  const goalProgress = ctx.input.goals.map((goal) => {
    const contributions = ctx.input.goalContributions.filter((c) => c.goalId === goal.id);
    return calculateGoalProgress(goal, contributions);
  });

  ctx.results.healthScore = calculateCentFlowScore({
    netWorth: netWorthMetrics.netWorth,
    netWorthChangePercent: netWorthMetrics.changePercent,
    monthlyIncome: cashFlow.monthlyIncome,
    monthlyExpenses: cashFlow.monthlyExpenses,
    monthlySubscriptionCost: subMonthlyTotal,
    totalDebt: creditSummary.totalDebt,
    goals: goalProgress.map((g) => ({ current: g.current, target: g.target })),
    subscriptionsRenewingSoon: renewingSoon,
    featuredGoalGap: goalProgress[0]
      ? Math.max(0, goalProgress[0].target - goalProgress[0].current)
      : null,
    warrantiesExpiringSoon: 0,
    weeklyExpenseDelta: null,
    goalsCount: ctx.input.goals.length,
    transactionCount: ctx.input.transactions.length,
  });
};

export const recalculateHomeSummary: FinancialEngineStepRunner = (ctx) => {
  const weeklySpending = getExpenseTotal(ctx.input.transactions, {
    kind: 'rolling',
    days: 7,
    asOf: ctx.asOf,
  });
  const netWorth =
    ctx.results.netWorth ??
    (() => {
      const base = resolveNetWorthFromContext(ctx);
      const monthly = calculateMonthlyNetWorthMetrics(
        ctx.input.transactions,
        {
          inventory: ctx.input.inventory,
          investments: [],
          credits: ctx.input.credits,
          savings: 0,
        },
        base.netWorth,
        ctx.asOf,
      );
      return {
        ...base,
        changePercent: monthly.netWorthChangePercent,
        monthlyChange: monthly.netWorthChangeThisMonth,
      };
    })();

  const message = getSmartSummaryMessage({
    hasActivity: ctx.input.transactions.length > 0,
    netWorth: netWorth.netWorth,
    changePercent: netWorth.changePercent,
    monthlyChange: netWorth.monthlyChange,
    weeklySpending,
  });

  ctx.results.homeSummary = { message, weeklySpending };
};

export const recalculateRecommendations: FinancialEngineStepRunner = async (ctx) => {
  const [
    { readRecommendationFiredRecords, writeRecommendationFiredRecords },
    { loadIgnoredSpendingHabits },
    { calculateFinancialState },
    { generateRecommendations, mergeRecommendationFiredRecords },
  ] = await Promise.all([
    import('@/lib/storage/recommendation-fired.storage'),
    import('@/lib/storage/ignored-habits.storage'),
    import('./financial-state'),
    import('./recommendations'),
  ]);

  const state = calculateFinancialState({
    transactions: ctx.input.transactions,
    accounts: ctx.input.accounts,
    credits: ctx.input.credits,
    goals: ctx.input.goals,
    goalContributions: ctx.input.goalContributions,
    subscriptions: ctx.input.subscriptions,
    inventory: ctx.input.inventory,
    loanPayments: ctx.input.loanPayments,
    today: ctx.asOf,
  });

  const [lastFired, ignoredHabitIds] = await Promise.all([
    readRecommendationFiredRecords(ctx.userId),
    loadIgnoredSpendingHabits(ctx.userId),
  ]);

  const recommendations = generateRecommendations(state, {
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
