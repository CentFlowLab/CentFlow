/** Projeções financeiras derivadas em tempo real (sem persistência em BD). */
export {
  buildCashflowProjection,
  calculateMonthlyIncomeMedian,
  CASHFLOW_PROJECTION_HORIZONS,
  type BuildCashflowProjectionInput,
  type CashflowNegativeCrossing,
  type CashflowProjectionHorizon,
  type CashflowProjectionPoint,
  type CashflowProjectionResult,
} from '@/lib/domain/financial/cashflow-projection';
