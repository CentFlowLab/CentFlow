import type { Transaction } from '@/lib/domain/transaction.types';

import { getPreviousCompleteMonthKeys } from './category-budgets';
import { getCurrentMonthRange, type FinancialPeriod } from './dates';
import { roundMoney } from './money';
import { calculateBudgetImpact } from './ledger-impact';
import { countsAsBudgetExpense } from './transaction-kind';
import { filterTransactionsByPeriod } from './transactions';

/** Compras pontuais — excluídas da estimativa de gasto variável recorrente. */
export const ONE_OFF_VARIABLE_CATEGORIES = [
  'electronics',
  'home_goods',
  'travel',
  'leisure_travel',
  'gifts',
] as const;

/** Categorias de subscrição / recorrentes explícitas (além de recurringId). */
export const RECURRING_EXPENSE_CATEGORIES = [
  'subscriptions',
  'streaming',
  'software',
  'magazines',
  'apps',
] as const;

/** Movimentos financeiros (não consumo corrente). */
export const FINANCIAL_MOVEMENT_CATEGORIES = ['bank', 'investment_exp', 'credit'] as const;

export const VARIABLE_SPEND_MONTH_COUNT = 3;
export const MIN_VARIABLE_SPEND_MONTHS = 2;
export const REAL_SAVINGS_ACTION_CAP_RATIO = 0.9;

export type VariableSpendMedianResult = {
  medianMonthly: number;
  monthlyTotals: number[];
  monthsUsed: number;
  monthKeys: string[];
};

export type RealSavingsMarginBreakdown = {
  availableThisMonth: number;
  variableMedianMonthly: number;
  variableMonthsUsed: number;
  variableMonthlyTotals: number[];
  variableMonthKeys: string[];
  daysRemaining: number;
  daysInMonth: number;
  variableProjection: number;
  rawMargin: number;
  cappedActionBudget: number;
  capRatio: number;
};

function monthPeriod(monthKey: string, asOf: Date): FinancialPeriod {
  return { kind: 'month', monthKey, asOf };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return roundMoney(sorted[mid]);
  return roundMoney((sorted[mid - 1] + sorted[mid]) / 2);
}

export function isOneOffVariableCategory(category: string | undefined): boolean {
  if (!category) return false;
  return (ONE_OFF_VARIABLE_CATEGORIES as readonly string[]).includes(category);
}

export function isRecurringExpenseCategory(category: string | undefined): boolean {
  if (!category) return false;
  return (RECURRING_EXPENSE_CATEGORIES as readonly string[]).includes(category);
}

export function isFinancialMovementCategory(category: string | undefined): boolean {
  if (!category) return false;
  return (FINANCIAL_MOVEMENT_CATEGORIES as readonly string[]).includes(category);
}

/** Gasto que entra na mediana de consumo variável recorrente. */
export function countsAsVariableSpendTransaction(tx: Transaction): boolean {
  if (!countsAsBudgetExpense(tx)) return false;
  if (tx.recurringId) return false;
  if (isOneOffVariableCategory(tx.category)) return false;
  if (isRecurringExpenseCategory(tx.category)) return false;
  if (isFinancialMovementCategory(tx.category)) return false;
  return true;
}

function sumVariableSpendInPeriod(transactions: Transaction[], period: FinancialPeriod): number {
  return roundMoney(
    filterTransactionsByPeriod(transactions, period)
      .filter(countsAsVariableSpendTransaction)
      .reduce((sum, tx) => sum + calculateBudgetImpact(tx).budgetExpenseDelta, 0),
  );
}

/** Mediana dos totais mensais de gasto variável nos últimos N meses civis completos. */
export function calculateVariableSpendMonthlyMedian(
  transactions: Transaction[],
  asOf: Date = new Date(),
  monthCount: number = VARIABLE_SPEND_MONTH_COUNT,
): VariableSpendMedianResult {
  const monthKeys = getPreviousCompleteMonthKeys(monthCount, asOf);
  const monthlyTotals = monthKeys.map((monthKey) =>
    sumVariableSpendInPeriod(transactions, monthPeriod(monthKey, asOf)),
  );
  const monthsWithSpend = monthlyTotals.filter((amount) => amount > 0).length;

  if (monthsWithSpend < MIN_VARIABLE_SPEND_MONTHS) {
    return {
      medianMonthly: 0,
      monthlyTotals,
      monthsUsed: monthsWithSpend,
      monthKeys,
    };
  }

  return {
    medianMonthly: median(monthlyTotals),
    monthlyTotals,
    monthsUsed: monthsWithSpend,
    monthKeys,
  };
}

export function calculateRemainingVariableProjection(
  medianMonthly: number,
  asOf: Date = new Date(),
): { daysRemaining: number; daysInMonth: number; projection: number } {
  const { start, end } = getCurrentMonthRange(asOf);
  const daysInMonth = end.getDate();
  const dayOfMonth = asOf.getDate();
  const daysRemaining = Math.max(0, daysInMonth - dayOfMonth);
  const projection = roundMoney((daysRemaining / daysInMonth) * medianMonthly);

  return { daysRemaining, daysInMonth, projection };
}

export function capActionAmount(rawMargin: number): number {
  if (rawMargin <= 0) return 0;
  return roundMoney(rawMargin * REAL_SAVINGS_ACTION_CAP_RATIO);
}

/** Margem real = disponível − projeção de gasto variável; acção limitada a 90%. */
export function calculateRealSavingsMargin(
  availableThisMonth: number,
  transactions: Transaction[],
  asOf: Date = new Date(),
): RealSavingsMarginBreakdown {
  const available = roundMoney(availableThisMonth);
  const variable = calculateVariableSpendMonthlyMedian(transactions, asOf);
  const { daysRemaining, daysInMonth, projection } = calculateRemainingVariableProjection(
    variable.medianMonthly,
    asOf,
  );
  const rawMargin = roundMoney(Math.max(0, available - projection));
  const cappedActionBudget = capActionAmount(rawMargin);

  return {
    availableThisMonth: available,
    variableMedianMonthly: variable.medianMonthly,
    variableMonthsUsed: variable.monthsUsed,
    variableMonthlyTotals: variable.monthlyTotals,
    variableMonthKeys: variable.monthKeys,
    daysRemaining,
    daysInMonth,
    variableProjection: projection,
    rawMargin,
    cappedActionBudget,
    capRatio: REAL_SAVINGS_ACTION_CAP_RATIO,
  };
}
