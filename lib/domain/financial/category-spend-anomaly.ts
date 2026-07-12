import { getCategoryLabel } from '@/lib/data/transaction-categories';
import type { Transaction } from '@/lib/domain/transaction.types';

import { formatMoney } from './money';
import {
  calculateCategorySpendMedian,
  isOneOffVariableCategory,
} from './savings-margin';
import { countsAsBudgetExpense } from './transaction-kind';

export const DEFAULT_CATEGORY_SPEND_ALERT_THRESHOLD = 2;
export const MIN_CATEGORY_SPEND_ALERT_THRESHOLD = 1.5;
export const MAX_CATEGORY_SPEND_ALERT_THRESHOLD = 3;
/** Diferença mínima absoluta (€) para evitar alertas triviais (ex.: 3€ vs 1,50€). */
export const MIN_CATEGORY_SPEND_ABSOLUTE_DELTA = 10;

export type CategorySpendAnomalyEvaluation = {
  category: string;
  categoryLabel: string;
  amount: number;
  medianAmount: number;
  percentAbove: number;
  thresholdMultiplier: number;
};

export function clampCategorySpendAlertThreshold(value: number): number {
  const rounded = Math.round(value * 2) / 2;
  return Math.min(
    MAX_CATEGORY_SPEND_ALERT_THRESHOLD,
    Math.max(MIN_CATEGORY_SPEND_ALERT_THRESHOLD, rounded),
  );
}

export function isCategorySpendAlertCandidate(tx: Pick<Transaction, 'type' | 'amount' | 'category'>): boolean {
  if (!countsAsBudgetExpense(tx)) return false;
  if (tx.amount <= 0) return false;
  if (isOneOffVariableCategory(tx.category)) return false;
  return true;
}

export function evaluateCategorySpendAnomaly(
  amount: number,
  category: string,
  transactions: Transaction[],
  options: {
    thresholdMultiplier?: number;
    asOf?: Date;
    excludeTransactionId?: string;
  } = {},
): CategorySpendAnomalyEvaluation | null {
  if (amount <= 0 || isOneOffVariableCategory(category)) return null;

  const thresholdMultiplier = clampCategorySpendAlertThreshold(
    options.thresholdMultiplier ?? DEFAULT_CATEGORY_SPEND_ALERT_THRESHOLD,
  );

  const baseline = calculateCategorySpendMedian(transactions, category, options.asOf, {
    excludeTransactionId: options.excludeTransactionId,
  });

  if (!baseline.hasEnoughHistory || baseline.medianAmount <= 0) return null;

  const thresholdAmount = baseline.medianAmount * thresholdMultiplier;
  const absoluteDelta = amount - baseline.medianAmount;

  if (amount < thresholdAmount || absoluteDelta < MIN_CATEGORY_SPEND_ABSOLUTE_DELTA) {
    return null;
  }

  const percentAbove = Math.round((absoluteDelta / baseline.medianAmount) * 100);

  return {
    category,
    categoryLabel: getCategoryLabel(category, 'expense'),
    amount,
    medianAmount: baseline.medianAmount,
    percentAbove,
    thresholdMultiplier,
  };
}

export function buildCategorySpendAnomalyMessage(evaluation: CategorySpendAnomalyEvaluation): string {
  return `Gasto em ${evaluation.categoryLabel} foi ${evaluation.percentAbove}% acima do habitual (mediana: ${formatMoney(evaluation.medianAmount)})`;
}
