import type { Goal } from '@/lib/domain/assets.types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { Credit } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { isCardCredit } from '@/lib/credit/credit-type.utils';

import { buildCashflowProjection } from './cashflow-projection';
import type { FinancialState } from './financial-state.types';
import { getMonthKey, startOfDay } from './dates';
import { formatMoney, roundMoney } from './money';
import { calculateRealSavingsMargin } from './savings-margin';
import { countsAsBudgetExpense } from './transaction-kind';

export type FinancialDecision =
  | { type: 'one_time_expense'; amount: number; category: string }
  | { type: 'debt_extra_payment'; amount: number; liabilityId: string }
  | { type: 'recurring_expense_change'; amount: number; categoryId: string };

export type DecisionGoalImpact = {
  goalId: string;
  goalName: string;
  daysDelayed: number;
  message: string;
};

export type DecisionSimulationResult = {
  decision: FinancialDecision;
  balanceAt30DaysBefore: number;
  balanceAt30DaysAfter: number;
  balanceDelta30Days: number;
  marginBefore: number;
  marginAfter: number;
  goalImpacts: DecisionGoalImpact[];
  goesNegativeThisMonth: boolean;
  negativeCrossingDate?: string;
  headline: string;
  recommendation: string;
  canProceedWithoutRisk: boolean;
  isReadOnly: true;
};

export type SimulateDecisionContext = {
  transactions: Transaction[];
  goalContributions?: GoalContribution[];
  loanPayments?: import('./loan-payments').LoanPaymentRecord[];
  goals?: Goal[];
  prioritizeDebtAmortization?: boolean;
  asOf?: Date;
};

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function applyDecisionToTransactions(
  transactions: Transaction[],
  decision: FinancialDecision,
  credits: Credit[],
  asOf: Date,
): { transactions: Transaction[]; credits: Credit[] } {
  const dateIso = toIsoDate(asOf);
  const nextTransactions = [...transactions];
  const nextCredits = credits.map((credit) => ({ ...credit }));

  switch (decision.type) {
    case 'one_time_expense':
      nextTransactions.push({
        id: `sim-expense-${decision.amount}`,
        type: 'expense',
        amount: decision.amount,
        category: decision.category,
        categoryLabel: decision.category,
        description: 'Despesa simulada',
        date: dateIso,
        currency: 'EUR',
      });
      break;

    case 'debt_extra_payment': {
      const credit = nextCredits.find((row) => row.id === decision.liabilityId);
      if (!credit) break;
      const paymentType = isCardCredit(credit.creditType) ? 'credit_card_payment' : 'credit_payment';
      nextTransactions.push({
        id: `sim-debt-${decision.liabilityId}`,
        type: paymentType,
        amount: decision.amount,
        category: 'credit',
        categoryLabel: 'Crédito',
        description: 'Pagamento extra simulado',
        date: dateIso,
        currency: 'EUR',
        creditId: decision.liabilityId,
      });
      credit.outstandingBalance = roundMoney(
        Math.max(0, credit.outstandingBalance - decision.amount),
      );
      break;
    }

    case 'recurring_expense_change':
      nextTransactions.push({
        id: `sim-recurring-${decision.categoryId}`,
        type: 'expense',
        amount: decision.amount,
        category: decision.categoryId,
        categoryLabel: decision.categoryId,
        description: 'Despesa recorrente simulada',
        date: dateIso,
        currency: 'EUR',
        recurringId: `sim-recurring-${decision.categoryId}`,
      });
      break;

    default:
      break;
  }

  return { transactions: nextTransactions, credits: nextCredits };
}

function budgetImpactAmount(decision: FinancialDecision): number {
  switch (decision.type) {
    case 'one_time_expense':
      return decision.amount;
    case 'debt_extra_payment':
      return decision.amount;
    case 'recurring_expense_change':
      return decision.amount;
    default:
      return 0;
  }
}

function computeRealMargin(
  availableThisMonth: number,
  transactions: Transaction[],
  asOf: Date,
): number {
  return calculateRealSavingsMargin(availableThisMonth, transactions, asOf).cappedActionBudget;
}

function estimateGoalImpacts(
  financialState: FinancialState,
  marginBefore: number,
  marginAfter: number,
  goals: Goal[] | undefined,
  asOf: Date,
): DecisionGoalImpact[] {
  const daysRemaining = Math.max(1, financialState.budget.daysRemaining);
  const dailyBefore = marginBefore > 0 ? marginBefore / daysRemaining : 0;
  const dailyAfter = marginAfter > 0 ? marginAfter / daysRemaining : 0;
  const impacts: DecisionGoalImpact[] = [];

  for (const progress of financialState.goalProgress) {
    if (progress.isComplete || progress.remaining <= 0) continue;

    const goalMeta = goals?.find((goal) => goal.id === progress.id);
    const daysBefore =
      dailyBefore > 0 ? Math.ceil(progress.remaining / dailyBefore) : Number.POSITIVE_INFINITY;
    const daysAfter =
      dailyAfter > 0 ? Math.ceil(progress.remaining / dailyAfter) : Number.POSITIVE_INFINITY;

    const daysDelayed =
      Number.isFinite(daysBefore) && Number.isFinite(daysAfter)
        ? Math.max(0, daysAfter - daysBefore)
        : dailyBefore > 0 && dailyAfter <= 0
          ? daysRemaining
          : 0;

    if (daysDelayed < 1) continue;

    let message = `Atrasa o objetivo "${progress.name}" em ~${daysDelayed} dias`;
    if (goalMeta?.deadline) {
      message += ` (meta: ${goalMeta.deadline.slice(0, 10)})`;
    }

    impacts.push({
      goalId: progress.id,
      goalName: progress.name,
      daysDelayed,
      message,
    });
  }

  return impacts.sort((a, b) => b.daysDelayed - a.daysDelayed);
}

function goesNegativeInCurrentMonth(
  points: Array<{ date: string; balance: number }>,
  asOf: Date,
): { negative: boolean; crossingDate?: string } {
  const monthKey = getMonthKey(asOf);
  const crossing = points.find((point) => point.date.startsWith(monthKey) && point.balance < 0);
  return {
    negative: Boolean(crossing),
    crossingDate: crossing?.date,
  };
}

function buildHeadline(
  decision: FinancialDecision,
  marginAfter: number,
  balanceDelta30: number,
  goalImpacts: DecisionGoalImpact[],
  goesNegative: boolean,
): { headline: string; recommendation: string; canProceed: boolean } {
  if (goesNegative) {
    return {
      headline: 'Esta decisão deixa o saldo projetado negativo este mês.',
      recommendation: 'Adia ou reduz o valor — o orçamento não aguenta sem entrar em défice.',
      canProceed: false,
    };
  }

  if (marginAfter <= 0) {
    return {
      headline: 'Sem margem real até ao fim do mês após esta decisão.',
      recommendation:
        'Não é excedente disponível — ainda há despesas variáveis e obrigações por cobrir.',
      canProceed: false,
    };
  }

  const topGoal = goalImpacts[0];
  if (topGoal && topGoal.daysDelayed >= 7) {
    return {
      headline: `Esta decisão atrasa o objetivo "${topGoal.goalName}" em ~${topGoal.daysDelayed} dias.`,
      recommendation: `Saldo a 30 dias: ${balanceDelta30 >= 0 ? 'ligeiramente melhor' : `${formatMoney(Math.abs(balanceDelta30))} menos`}. Confirma só se aceitas esse atraso.`,
      canProceed: balanceDelta30 >= -100,
    };
  }

  if (decision.type === 'debt_extra_payment' && balanceDelta30 >= 0) {
    return {
      headline: 'O pagamento extra melhora a trajetória de caixa nos próximos 30 dias.',
      recommendation: 'Podes confirmar se manténs colchão para imprevistos este mês.',
      canProceed: true,
    };
  }

  return {
    headline: 'Podes fazer isto sem comprometer o orçamento.',
    recommendation: `Margem real estimada após a decisão: ${formatMoney(marginAfter)}.`,
    canProceed: true,
  };
}

/**
 * Simula impacto de uma decisão financeira sem persistir dados.
 * Usa projeção de cashflow + margem real (não saldo bruto como excedente).
 */
export function simulateDecision(
  financialState: FinancialState,
  decision: FinancialDecision,
  context: SimulateDecisionContext,
): DecisionSimulationResult {
  const asOf = startOfDay(context.asOf ?? financialState.asOf);
  const transactions = context.transactions ?? [];
  const goalContributions = context.goalContributions ?? [];
  const loanPayments = context.loanPayments ?? [];
  const prioritizeDebt = context.prioritizeDebtAmortization ?? true;

  const projectionBefore = buildCashflowProjection({
    transactions,
    subscriptions: financialState.subscriptions.items,
    credits: financialState.credits,
    goalContributions,
    loanPayments,
    prioritizeDebtAmortization: prioritizeDebt,
    horizon: 30,
    asOf,
  });

  const applied = applyDecisionToTransactions(
    transactions,
    decision,
    financialState.credits,
    asOf,
  );

  const budgetDelta = budgetImpactAmount(decision);
  const availableAfter = roundMoney(financialState.availableThisMonth - budgetDelta);

  const projectionAfter = buildCashflowProjection({
    transactions: applied.transactions,
    subscriptions: financialState.subscriptions.items,
    credits: applied.credits,
    goalContributions,
    loanPayments,
    prioritizeDebtAmortization: prioritizeDebt,
    horizon: 30,
    asOf,
  });

  const marginBefore = computeRealMargin(
    financialState.availableThisMonth,
    transactions,
    asOf,
  );
  const marginAfter = computeRealMargin(availableAfter, applied.transactions, asOf);

  const monthNegative = goesNegativeInCurrentMonth(projectionAfter.points, asOf);
  const goesNegativeThisMonth =
    monthNegative.negative || availableAfter < 0 || Boolean(projectionAfter.negativeCrossing);

  const goalImpacts = estimateGoalImpacts(
    financialState,
    marginBefore,
    marginAfter,
    context.goals,
    asOf,
  );

  const balanceDelta30Days = roundMoney(
    projectionAfter.horizonBalance - projectionBefore.horizonBalance,
  );

  const { headline, recommendation, canProceed } = buildHeadline(
    decision,
    marginAfter,
    balanceDelta30Days,
    goalImpacts,
    goesNegativeThisMonth,
  );

  return {
    decision,
    balanceAt30DaysBefore: projectionBefore.horizonBalance,
    balanceAt30DaysAfter: projectionAfter.horizonBalance,
    balanceDelta30Days,
    marginBefore,
    marginAfter,
    goalImpacts,
    goesNegativeThisMonth,
    negativeCrossingDate: monthNegative.crossingDate ?? projectionAfter.negativeCrossing?.date,
    headline,
    recommendation,
    canProceedWithoutRisk: canProceed,
    isReadOnly: true,
  };
}
