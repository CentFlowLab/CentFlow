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

export { buildFinancialCalendar } from './calendar';
export { buildSpendingCalendar } from './spending-calendar';
