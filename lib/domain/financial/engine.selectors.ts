/**
 * Seletores puros sobre FinancialState / resultados do motor — sem React, sem I/O.
 */
import type { CategoryBudgetStatus } from '@/lib/domain/category-budget.types';
import { isCardCredit } from '@/lib/credit/credit-type.utils';

import type { CashflowProjectionResult } from './cashflow-projection';
import type { FinancialState } from './financial-state.types';
import type { FinancialEngineStepResults } from './engine.types';

export type DebtSummaryView = {
  totalDebt: number;
  cardDebt: number;
  loanDebt: number;
  cardCount: number;
  loanCount: number;
  monthlyPayments: number;
};

export type CreditCardDebtView = {
  creditId: string;
  name: string;
  debt: number;
  limit?: number;
  available?: number;
  utilizationPercent?: number;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
};

export type LoanDebtView = {
  creditId: string;
  name: string;
  outstandingBalance: number;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
};

export function selectCurrentNetWorth(state: FinancialState): number {
  return state.netWorth.netWorth;
}

export function selectProjectedNetWorth(state: FinancialState): number {
  return state.projection.netWorth;
}

export function selectAccountBalances(state: FinancialState) {
  return state.accounts.map((account) => ({
    id: account.id,
    name: account.name,
    balance: account.balance,
    type: account.type,
    currency: account.currency,
    budgetEnabledResolved: account.budgetEnabledResolved,
  }));
}

export function selectCashflowProjection(
  results: FinancialEngineStepResults | undefined,
): CashflowProjectionResult | null {
  return results?.cashflowProjection ?? null;
}

export function selectCategoryBudgetStatus(
  results: FinancialEngineStepResults | undefined,
): CategoryBudgetStatus[] {
  return results?.categoryBudgets ?? [];
}

/** Dívida total — ledger para cartões, outstanding para empréstimos. */
export function selectDebtSummary(state: FinancialState): DebtSummaryView {
  const cards = state.creditCards;
  const loans = state.credits.filter((c) => !isCardCredit(c.creditType));
  const cardDebt = cards.reduce((sum, card) => sum + card.debt, 0);
  const loanDebt = loans.reduce((sum, loan) => sum + Math.max(0, loan.outstandingBalance), 0);
  return {
    totalDebt: cardDebt + loanDebt,
    cardDebt,
    loanDebt,
    cardCount: cards.length,
    loanCount: loans.length,
    monthlyPayments: state.creditSummary.monthlyPayments,
  };
}

export function selectCreditCardDebts(state: FinancialState): CreditCardDebtView[] {
  return state.creditCards.map((card) => ({
    creditId: card.credit.id,
    name: card.credit.name,
    debt: card.debt,
    limit: card.limit,
    available: card.available,
    utilizationPercent: card.utilizationPercent,
    nextPaymentDate: card.credit.nextPaymentDate,
    nextPaymentAmount: card.credit.nextPaymentAmount,
  }));
}

export function selectLoanDebts(state: FinancialState): LoanDebtView[] {
  return state.credits
    .filter((credit) => !isCardCredit(credit.creditType))
    .map((loan) => ({
      creditId: loan.id,
      name: loan.name,
      outstandingBalance: loan.outstandingBalance,
      nextPaymentDate: loan.nextPaymentDate,
      nextPaymentAmount: loan.nextPaymentAmount,
    }));
}

export function selectCreditCardDebt(state: FinancialState, creditId: string): number {
  return state.creditCards.find((card) => card.credit.id === creditId)?.debt ?? 0;
}

export function selectGoalProgress(state: FinancialState) {
  return state.goalProgress;
}

export function selectHomeFinancialSummary(state: FinancialState) {
  return {
    netWorth: state.netWorth.netWorth,
    netWorthChangePercent: state.netWorthChangePercent,
    netWorthChangeThisMonth: state.netWorthChangeThisMonth,
    availableThisMonth: state.availableThisMonth,
    weeklySpending: state.cashFlow.weeklySpending,
    healthScore: state.healthScore.score,
  };
}

/** Consistência multi-ecrã — totalDebt do selector = componentes. */
export function assertDebtSummaryConsistent(state: FinancialState): boolean {
  const summary = selectDebtSummary(state);
  const cards = selectCreditCardDebts(state);
  const loans = selectLoanDebts(state);
  const cardSum = cards.reduce((s, c) => s + c.debt, 0);
  const loanSum = loans.reduce((s, l) => s + l.outstandingBalance, 0);
  return (
    Math.abs(summary.cardDebt - cardSum) < 0.01 &&
    Math.abs(summary.loanDebt - loanSum) < 0.01 &&
    Math.abs(summary.totalDebt - (cardSum + loanSum)) < 0.01
  );
}
