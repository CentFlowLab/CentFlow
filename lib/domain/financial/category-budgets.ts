import { getCategoryLabel } from '@/lib/data/transaction-categories';
import type {
  CategoryBudget,
  CategoryBudgetLevel,
  CategoryBudgetStatus,
  SuggestedCategoryBudget,
} from '@/lib/domain/category-budget.types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { getCurrentMonthRange, getMonthKey, type FinancialPeriod } from './dates';
import { roundMoney } from './money';
import { groupTransactionsByCategory } from './transactions';

const SUGGESTION_MONTH_COUNT = 3;
const MIN_MONTHS_WITH_SPEND = 2;

/** Últimos N meses civis completos (exclui o mês de referência). */
export function getPreviousCompleteMonthKeys(count: number, asOf: Date = new Date()): string[] {
  const keys: string[] = [];
  const cursor = new Date(asOf.getFullYear(), asOf.getMonth() - 1, 15);
  for (let i = 0; i < count; i += 1) {
    keys.unshift(getMonthKey(cursor));
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return keys.filter(Boolean);
}

export function roundSuggestedLimit(amount: number): number {
  if (amount <= 0) return 0;
  return Math.ceil(amount / 5) * 5;
}

function monthPeriod(monthKey: string, asOf: Date): FinancialPeriod {
  return { kind: 'month', monthKey, asOf };
}

/** Média de gasto nos últimos 3 meses completos; exige ≥2 meses com gasto. */
export function suggestCategoryBudgets(
  transactions: Transaction[],
  asOf: Date = new Date(),
): SuggestedCategoryBudget[] {
  const monthKeys = getPreviousCompleteMonthKeys(SUGGESTION_MONTH_COUNT, asOf);
  const totalsByCategory = new Map<string, { label: string; monthAmounts: number[] }>();

  for (const monthKey of monthKeys) {
    const categories = groupTransactionsByCategory(transactions, monthPeriod(monthKey, asOf));
    const seenThisMonth = new Set<string>();

    for (const item of categories) {
      seenThisMonth.add(item.key);
      const bucket = totalsByCategory.get(item.key) ?? {
        label: item.label,
        monthAmounts: monthKeys.map(() => 0),
      };
      bucket.label = item.label || bucket.label;
      const index = monthKeys.indexOf(monthKey);
      bucket.monthAmounts[index] = item.amount;
      totalsByCategory.set(item.key, bucket);
    }

    for (const [key, bucket] of totalsByCategory) {
      if (!seenThisMonth.has(key)) continue;
      totalsByCategory.set(key, bucket);
    }
  }

  const suggestions: SuggestedCategoryBudget[] = [];

  for (const [category, bucket] of totalsByCategory) {
    const monthsWithSpend = bucket.monthAmounts.filter((amount) => amount > 0).length;
    if (monthsWithSpend < MIN_MONTHS_WITH_SPEND) continue;

    const average = roundMoney(
      bucket.monthAmounts.reduce((sum, amount) => sum + amount, 0) / SUGGESTION_MONTH_COUNT,
    );
    const monthlyLimit = roundSuggestedLimit(average);
    if (monthlyLimit <= 0) continue;

    suggestions.push({
      category,
      label: bucket.label || getCategoryLabel(category, 'expense'),
      monthlyLimit,
      monthsWithSpend,
    });
  }

  return suggestions.sort((a, b) => b.monthlyLimit - a.monthlyLimit);
}

/** Manual prevalece; sugestões preenchem categorias em falta. */
export function mergeBudgetTemplates(
  stored: CategoryBudget[],
  suggested: SuggestedCategoryBudget[],
): CategoryBudget[] {
  const byCategory = new Map<string, CategoryBudget>();

  for (const suggestion of suggested) {
    byCategory.set(suggestion.category, {
      id: `suggested-${suggestion.category}`,
      category: suggestion.category,
      monthlyLimit: suggestion.monthlyLimit,
      source: 'suggested',
    });
  }

  for (const budget of stored) {
    byCategory.set(budget.category, budget);
  }

  return [...byCategory.values()].sort((a, b) => a.category.localeCompare(b.category));
}

export function resolveCategoryBudgetLevel(ratio: number): CategoryBudgetLevel {
  if (ratio >= 1) return 'over100';
  if (ratio >= 0.8) return 'warn80';
  return 'ok';
}

export function calculateCategoryBudgetStatus(
  budgets: CategoryBudget[],
  transactions: Transaction[],
  asOf: Date = new Date(),
): CategoryBudgetStatus[] {
  const { monthKey } = getCurrentMonthRange(asOf);
  const spentByCategory = new Map(
    groupTransactionsByCategory(transactions, monthPeriod(monthKey, asOf)).map((item) => [
      item.key,
      item,
    ]),
  );

  return budgets
    .map((budget) => {
      const spentItem = spentByCategory.get(budget.category);
      const spent = roundMoney(spentItem?.amount ?? 0);
      const monthlyLimit = roundMoney(budget.monthlyLimit);
      const ratio = monthlyLimit > 0 ? roundMoney(spent / monthlyLimit) : spent > 0 ? 1 : 0;

      return {
        category: budget.category,
        label: spentItem?.label ?? getCategoryLabel(budget.category, 'expense'),
        monthlyLimit,
        spent,
        ratio,
        level: resolveCategoryBudgetLevel(ratio),
        source: budget.source,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

/** Upsert sugeridos só onde ainda não existe registo persistido. */
export function pickSeedableSuggestions(
  existing: CategoryBudget[],
  suggested: SuggestedCategoryBudget[],
): SuggestedCategoryBudget[] {
  const existingCategories = new Set(existing.map((item) => item.category));
  return suggested.filter(
    (item) => !existingCategories.has(item.category) && item.monthlyLimit > 0,
  );
}
