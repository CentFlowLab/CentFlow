import type { RecurringInvestment } from '@/lib/domain/types';
import type { Suggestion } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { buildAttentionItems } from '@/lib/domain/attention-items';
import { calculateMonthlyNetWorthMetrics } from '@/lib/domain/net-worth-monthly';
import { sumGlobalCashBalance, sumTransactionCashBalance, filterOccurredTransactions } from '@/lib/domain/financial/transactions';
import { isCardCredit } from '@/lib/credit/credit-type.utils';
import { countRenewalsSoon } from '@/lib/subscriptions/renewal.utils';

import { enrichAccountsWithBalances } from './accounts';
import { resolveBudgetEnabled } from './budget-accounts';
import { buildMonthlySpendingTimeline } from './calendar';
import {
  calculateCentFlowScore,
  monthlySubscriptionTotal,
} from './centflow-score';
import {
  calculateAvailableCredit,
  calculateCreditUtilization,
  computeCreditCardDebtFromTransactions,
} from './credit-cards';
import { summarizeFinancialEvents } from './events';
import { explainMonthlyAvailable, explainNetWorth } from './explain';
import type {
  CalculateFinancialStateInput,
  CreditCardState,
  EnrichedAccountState,
  FinancialState,
  GoalProgressState,
  HealthScoreState,
} from './financial-state.types';
import { calculateGoalProgress } from './goals';
import { getExpenseTotal } from './transactions';
import { buildMonthlyAvailableBreakdown } from './monthly-available.compose';
import { calculateConsolidatedNetWorth, sumRecurringInvestments } from './netWorth';
import { buildFinancialOpportunities } from './opportunities';
import {
  buildCashFlowState,
  calculateFinancialMetrics,
  summarizeCreditExposure,
} from './metrics';
import { buildNetWorthProjection } from './projections';
import { mapFinancialSuggestionsToHome } from './suggestions';
import { buildScoreExplanation } from './score-explain';

function sumWeeklyExpenses(
  transactions: CalculateFinancialStateInput['transactions'],
  asOf: Date,
): number {
  return getExpenseTotal(transactions, { kind: 'rolling', days: 7, asOf });
}

function buildHomeOnboardingSuggestions(input: {
  goals: NonNullable<CalculateFinancialStateInput['goals']>;
  hasTransactions: boolean;
  weeklySpending: number;
  netWorthChangePercent: number;
}): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (input.goals.length === 0 && !input.hasTransactions) {
    suggestions.push({
      id: 'sug-first-goal',
      title: 'Define o teu primeiro objetivo',
      description: 'Um alvo concreto ajuda-te a poupar com mais foco.',
      actionLabel: 'Criar objetivo',
      type: 'goal',
      ctaRoute: '/(tabs)/ativos?action=new-goal',
    });
  }

  if (input.weeklySpending > 0 && input.netWorthChangePercent < 0) {
    suggestions.push({
      id: 'sug-review-spending',
      title: 'Revê os gastos desta semana',
      description: 'Identifica onde podes otimizar antes do fim do mês.',
      actionLabel: 'Ver análises',
      type: 'savings',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'sug-analyses',
      title: 'Explora as tuas análises',
      description: 'Vê como o património está distribuído entre categorias.',
      actionLabel: 'Abrir análises',
      type: 'general',
    });
  }

  return suggestions.slice(0, 2);
}

function buildCreditCardStates(
  credits: NonNullable<CalculateFinancialStateInput['credits']>,
  transactions: Transaction[],
): CreditCardState[] {
  return credits
    .filter((credit) => isCardCredit(credit.creditType))
    .map((credit) => {
      const debtRounded = computeCreditCardDebtFromTransactions(credit.id, transactions);
      const withDebt = { ...credit, outstandingBalance: debtRounded };
      const limit =
        credit.originalAmount != null && credit.originalAmount > 0
          ? credit.originalAmount
          : undefined;
      const available = calculateAvailableCredit(withDebt) ?? undefined;
      const utilizationPercent = calculateCreditUtilization(withDebt) ?? undefined;
      return { credit: withDebt, debt: debtRounded, limit, available, utilizationPercent };
    });
}

function resolveDisplayAccounts(
  enrichedAccounts: EnrichedAccountState[],
  transactions: CalculateFinancialStateInput['transactions'],
  goalContributions: CalculateFinancialStateInput['goalContributions'],
  loanPayments: CalculateFinancialStateInput['loanPayments'],
  asOf: Date,
): EnrichedAccountState[] {
  if (enrichedAccounts.length > 0) return enrichedAccounts;

  const occurredCash = sumGlobalCashBalance(transactions, {
    goalContributions,
    loanPayments,
    scope: 'occurred',
    asOf,
  });
  if (occurredCash === 0) return [];

  return [
    {
      id: 'global-cash',
      name: 'Saldo',
      type: 'checking',
      balance: occurredCash,
      initialBalance: 0,
      isActive: true,
      currency: 'EUR',
      budgetEnabledResolved: true,
    },
  ];
}

function buildInvestmentSummary(
  accounts: EnrichedAccountState[],
  investments?: CalculateFinancialStateInput['investments'],
): FinancialState['investmentSummary'] {
  const fromAccounts = accounts
    .filter((a) => a.isActive && a.type === 'investment')
    .map((a) => ({
      id: a.id,
      name: a.name,
      currentValue: a.balance,
      isActive: true,
    }));

  const merged = investments?.length ? investments : fromAccounts;
  const totalBalance = sumRecurringInvestments(merged as RecurringInvestment[]);

  return {
    totalBalance,
    accountCount: merged.filter((i) => i.isActive !== false).length,
  };
}

function resolveNetWorthInput(input: {
  accounts: EnrichedAccountState[];
  transactions: CalculateFinancialStateInput['transactions'];
  occurredTransactions: CalculateFinancialStateInput['transactions'];
  goals: NonNullable<CalculateFinancialStateInput['goals']>;
  goalContributions: CalculateFinancialStateInput['goalContributions'];
  loanPayments: CalculateFinancialStateInput['loanPayments'];
  inventory: NonNullable<CalculateFinancialStateInput['inventory']>;
  investments: RecurringInvestment[];
  credits: NonNullable<CalculateFinancialStateInput['credits']>;
  asOf: Date;
}) {
  const activeAccounts = input.accounts.filter((a) => a.isActive);
  const accountRows = activeAccounts.map((account) => ({
    id: account.id,
    name: account.name,
    balance: account.balance,
    currency: account.currency ?? 'EUR',
  }));

  if (accountRows.length === 0) {
    const occurredCash = sumGlobalCashBalance(input.transactions, {
      goalContributions: input.goalContributions,
      loanPayments: input.loanPayments,
      scope: 'occurred',
      asOf: input.asOf,
    });
    if (occurredCash !== 0) {
      accountRows.push({
        id: 'global-cash',
        name: 'Saldo',
        balance: occurredCash,
        currency: 'EUR',
      });
    }
  }

  const goalRows = input.goals.map((goal) => {
    const contributions = (input.goalContributions ?? []).filter((c) => c.goalId === goal.id);
    const progress = calculateGoalProgress(goal, contributions);
    // Só soma em património quando há contribuições — evita duplicar liquidez já nas contas.
    const currentForNetWorth = contributions.length > 0 ? progress.current : 0;
    return { current: currentForNetWorth };
  });

  const creditsForNetWorth = input.credits.map((credit) => {
    if (!isCardCredit(credit.creditType)) return credit;
    return {
      ...credit,
      outstandingBalance: computeCreditCardDebtFromTransactions(
        credit.id,
        input.occurredTransactions,
      ),
    };
  });

  return calculateConsolidatedNetWorth({
    accounts: accountRows,
    goals: goalRows,
    inventory: input.inventory,
    investments: input.investments,
    credits: creditsForNetWorth,
  });
}

/** Agregador único — toda a lógica financeira nasce aqui. */
export function calculateFinancialState(input: CalculateFinancialStateInput): FinancialState {
  const asOf = input.today ?? new Date();
  const accounts = input.accounts ?? [];
  const credits = input.credits ?? [];
  const goals = input.goals ?? [];
  const goalContributions = input.goalContributions ?? [];
  const subscriptions = input.subscriptions ?? [];
  const inventory = input.inventory ?? [];
  const loanPayments = input.loanPayments ?? [];
  const occurredTransactions = filterOccurredTransactions(input.transactions, asOf);

  const accountsWithBalances = enrichAccountsWithBalances(
    accounts,
    occurredTransactions,
    goalContributions,
    loanPayments,
  );

  const enrichedAccounts: EnrichedAccountState[] = accountsWithBalances.map((account) => ({
    ...account,
    balance: account.balance ?? 0,
    budgetEnabledResolved: resolveBudgetEnabled(account),
  }));

  const displayAccounts = resolveDisplayAccounts(
    enrichedAccounts,
    input.transactions,
    goalContributions,
    loanPayments,
    asOf,
  );

  const budget = buildMonthlyAvailableBreakdown({
    accounts,
    transactions: input.transactions,
    goalContributions,
    credits,
    subscriptions,
    loanPayments,
    referenceDate: asOf,
  });

  const availableThisMonth = budget.available;
  const dailySafeSpend = budget.dailySafeSpend;
  const budgetExplanation = explainMonthlyAvailable(budget);

  const investmentAccounts = enrichedAccounts.filter((a) => a.type === 'investment');
  const recurringInvestments: RecurringInvestment[] = input.investments?.length
    ? input.investments.map((inv) => ({
        id: inv.id,
        name: inv.name,
        currentValue: inv.currentValue,
        isActive: inv.isActive !== false,
        appliedAmount: 0,
      }))
    : investmentAccounts.map((account) => ({
        id: account.id,
        name: account.name,
        currentValue: account.balance,
        isActive: true,
        appliedAmount: 0,
      }));

  const netWorthInvestments =
    input.investments?.length && input.investments.length > 0
      ? recurringInvestments
      : [];

  const netWorth = resolveNetWorthInput({
    accounts: enrichedAccounts,
    transactions: input.transactions,
    occurredTransactions,
    goals,
    goalContributions,
    loanPayments,
    inventory,
    investments: netWorthInvestments,
    credits,
    asOf,
  });

  const netWorthExplanation = explainNetWorth(netWorth);

  const futureMovementsDelta = sumTransactionCashBalance(input.transactions, 'future', asOf);
  const projection = buildNetWorthProjection(netWorth.netWorth, futureMovementsDelta);

  const monthlyMetrics = calculateMonthlyNetWorthMetrics(
    input.transactions,
    {
      inventory,
      investments: recurringInvestments,
      credits,
      savings: 0,
    },
    netWorth.netWorth,
    asOf,
  );

  const weeklySpending = sumWeeklyExpenses(input.transactions, asOf);
  const cashFlow = buildCashFlowState(input.transactions, weeklySpending, asOf);

  const goalProgress: GoalProgressState[] = goals.map((goal) => {
    const contributions = goalContributions.filter((c) => c.goalId === goal.id);
    const progress = calculateGoalProgress(goal, contributions);
    return {
      id: goal.id,
      name: goal.name,
      current: progress.current,
      target: progress.target,
      percent: progress.percent,
      remaining: progress.remaining,
      isComplete: progress.isComplete,
    };
  });

  const subMonthlyTotal = monthlySubscriptionTotal(subscriptions);
  const subscriptionState = {
    items: subscriptions,
    monthlyTotal: subMonthlyTotal,
    renewingSoon: countRenewalsSoon(subscriptions),
  };

  const investmentSummary = buildInvestmentSummary(enrichedAccounts, input.investments);
  const creditCards = buildCreditCardStates(credits, occurredTransactions);
  const creditsWithLedgerDebt = credits.map((credit) => {
    const card = creditCards.find((entry) => entry.credit.id === credit.id);
    if (card) return { ...credit, outstandingBalance: card.debt };
    return credit;
  });
  const creditSummary = summarizeCreditExposure(creditsWithLedgerDebt);
  const calendar = buildMonthlySpendingTimeline(input.transactions, asOf);

  const metrics = calculateFinancialMetrics({
    transactions: input.transactions,
    monthlyIncome: cashFlow.monthlyIncome,
    monthlyExpenses: cashFlow.monthlyExpenses,
    availableThisMonth,
    dailySafeSpend,
    consumptionSpending: budget.consumptionSpending,
    netWorth: netWorth.netWorth,
    netWorthChangePercent: monthlyMetrics.netWorthChangePercent,
    totalDebt: creditSummary.totalDebt,
    subscriptions,
    goals: goalProgress,
    investmentSummary,
    credits,
    asOf,
  });

  const opportunities = buildFinancialOpportunities({
    accounts: displayAccounts,
    credits,
    creditCards,
    availableThisMonth,
    cashFlow,
    metrics,
    goalProgress,
    subscriptions: subscriptionState,
    investmentSummary,
  });

  const onboardingSuggestions = buildHomeOnboardingSuggestions({
    goals,
    hasTransactions: input.transactions.length > 0,
    weeklySpending,
    netWorthChangePercent: monthlyMetrics.netWorthChangePercent,
  });

  const financialHomeSuggestions = mapFinancialSuggestionsToHome(opportunities.suggestions);
  const seen = new Set<string>();
  const suggestions = [...financialHomeSuggestions, ...onboardingSuggestions].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, 3);

  const scoreInput = {
    netWorth: netWorth.netWorth,
    netWorthChangePercent: monthlyMetrics.netWorthChangePercent,
    monthlyIncome: cashFlow.monthlyIncome,
    monthlyExpenses: cashFlow.monthlyExpenses,
    monthlySubscriptionCost: subMonthlyTotal,
    totalDebt: creditSummary.totalDebt,
    goals: goalProgress.map((g) => ({ current: g.current, target: g.target })),
    subscriptionsRenewingSoon: subscriptionState.renewingSoon,
    featuredGoalGap: goalProgress[0]
      ? Math.max(0, goalProgress[0].target - goalProgress[0].current)
      : null,
    warrantiesExpiringSoon: 0,
    weeklyExpenseDelta: null,
    goalsCount: goals.length,
    transactionCount: input.transactions.length,
  };

  const scoreResult = calculateCentFlowScore(scoreInput);
  const healthScore: HealthScoreState = {
    ...scoreResult,
    input: scoreInput,
    explanation: buildScoreExplanation(scoreResult),
  };

  const attentionItems = buildAttentionItems({
    warranties: [],
    credits,
    subscriptions,
    goals,
    asOf,
  });

  const warnings: FinancialState['warnings'] = [];
  if (availableThisMonth < 0) {
    warnings.push({
      code: 'BUDGET_NEGATIVE',
      message: 'O disponível deste mês está negativo.',
    });
  }

  const events = summarizeFinancialEvents(input.transactions);

  return {
    asOf,
    accounts: displayAccounts,
    creditCards,
    credits,
    budget,
    availableThisMonth,
    dailySafeSpend,
    budgetExplanation,
    cashFlow,
    netWorth,
    netWorthExplanation,
    projection,
    previousMonthNetWorth: monthlyMetrics.previousMonthNetWorth,
    netWorthChangePercent: monthlyMetrics.netWorthChangePercent,
    netWorthChangeThisMonth: monthlyMetrics.netWorthChangeThisMonth,
    goalProgress,
    subscriptions: subscriptionState,
    investmentSummary,
    creditSummary,
    calendar,
    metrics,
    insights: opportunities.insights,
    warnings,
    suggestions,
    financialSuggestions: opportunities.suggestions,
    attentionItems,
    healthScore,
    events,
    dashboard: { personalInflation: null },
  };
}

/** Compatível com DashboardData legado. */
export function financialStateToDashboard(state: FinancialState) {
  return {
    netWorth: state.netWorth,
    projection: state.projection,
    previousMonthNetWorth: state.previousMonthNetWorth,
    netWorthChangePercent: state.netWorthChangePercent,
    weeklySpending: state.cashFlow.weeklySpending,
    netWorthChangeThisMonth: state.netWorthChangeThisMonth,
    personalInflation: state.dashboard.personalInflation,
    attentionItems: state.attentionItems,
    suggestions: state.suggestions,
  };
}
