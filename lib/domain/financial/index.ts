/** Domínio financeiro central — funções puras, sem I/O. */

export * from './money';
export * from './dates';
export * from './domain-types';
export * from './transactions';
export * from './accounts';
export * from './goals';
export * from './liabilities';
export * from './netWorth';
export * from './projections';
export * from './savings';
export * from './insights';
export * from './transfers';
export * from './credit-cards';
export * from './score';

export * from './types';
export * from './assistant';
export * from './score-explain';

/** Financial Core Engine v2 */
export type { FinancialState, CalculateFinancialStateInput } from './financial-state.types';
export { calculateFinancialState, financialStateToDashboard } from './financial-state';
export * from './events';
export * from './explain';
export * from './metrics';
export * from './calendar';
export * from './opportunities';
export * from './financial-doctor';
export * from './simulator';

export * from './budget';
export * from './cashflow';
export * from './forecast';
export * from './credits';
export * from './creditCards';
export * from './assets';
export * from './investments';
export * from './subscriptions';
export * from './analytics';
export * from './category-budgets';
export * from './savings-allocation';
export * from './subscription-review';
export * from './action-engine';
