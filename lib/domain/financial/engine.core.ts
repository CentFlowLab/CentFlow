/**
 * Núcleo do motor financeiro unificado — delega em calculateFinancialState (v1 canónico).
 */
import { getSmartSummaryMessage } from '@/lib/home/smart-summary';

import { calculateFinancialState } from './financial-state';
import type { CalculateFinancialStateInput, FinancialState } from './financial-state.types';
import type { FinancialEngineCoreInput } from './engine.contract';
import type { FinancialEngineInput, FinancialEngineNetWorthResult } from './engine.types';

export function toCalculateFinancialStateInput(
  input: FinancialEngineCoreInput | FinancialEngineInput,
  asOf: Date,
): CalculateFinancialStateInput {
  return {
    transactions: input.transactions,
    accounts: input.accounts,
    credits: input.credits,
    goals: input.goals,
    goalContributions: input.goalContributions,
    subscriptions: input.subscriptions,
    inventory: input.inventory,
    loanPayments: input.loanPayments,
    investments: 'investments' in input ? input.investments : undefined,
    today: asOf,
  };
}

/** Executa o motor canónico — única função com regras financeiras. */
export function runCoreFinancialState(
  input: FinancialEngineInput,
  asOf: Date,
): FinancialState {
  return calculateFinancialState(toCalculateFinancialStateInput(input, asOf));
}

export function coreStateToEngineNetWorth(state: FinancialState): FinancialEngineNetWorthResult {
  return {
    ...state.netWorth,
    changePercent: state.netWorthChangePercent,
    monthlyChange: state.netWorthChangeThisMonth,
  };
}

export function coreStateToHomeSummary(
  state: FinancialState,
  hasActivity: boolean,
): { message: string; weeklySpending: number } {
  return {
    message: getSmartSummaryMessage({
      hasActivity,
      netWorth: state.netWorth.netWorth,
      changePercent: state.netWorthChangePercent,
      monthlyChange: state.netWorthChangeThisMonth,
      weeklySpending: state.cashFlow.weeklySpending,
    }),
    weeklySpending: state.cashFlow.weeklySpending,
  };
}
