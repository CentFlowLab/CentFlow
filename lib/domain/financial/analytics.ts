/** Análises e métricas agregadas. */
export { calculateFinancialMetrics, type FinancialMetrics } from './metrics';
export {
  groupTransactionsByCategory,
  groupTransactionsByMerchant,
  getTopCategory,
  getTopMerchant,
  getNetCashflow,
} from './transactions';
export { calculateConsumptionSpending, calculateBudgetImpact } from './ledger-impact';

export {
  buildFinancialCalendar,
  buildMonthlySpendingTimeline,
  type FinancialCalendarResult,
  type FinancialCalendarProjectionDay,
  type FinancialCalendarEvent,
  type FinancialCalendarDayRisk,
  type BuildFinancialCalendarContext,
} from './calendar';
export { buildSpendingCalendar } from './spending-calendar';
