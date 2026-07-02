/** Orçamento mensal — re-export do módulo de disponível. */
export {
  calculateMonthlyAvailableBreakdown,
  breakdownToSpendableOutput,
  type MonthlyAvailableBreakdown,
  type MonthlyAvailableObligation,
} from './monthly-available';

export { buildMonthlyAvailableBreakdown, sumIncomeReceived } from './monthly-available.compose';

export {
  defaultBudgetEnabledForType,
  resolveBudgetEnabled,
  isBudgetAccount,
  getBudgetAccountIds,
  partitionAccountsByBudget,
  sumBudgetAccountBalances,
  calculateBudgetTransferFlow,
  toBudgetAccountSnapshots,
} from './budget-accounts';

export { explainMonthlyAvailable, type BudgetExplanation } from './explain';
