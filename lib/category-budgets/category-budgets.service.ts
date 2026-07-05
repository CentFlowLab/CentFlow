import type { CategoryBudget, CategoryBudgetSource } from '@/lib/domain/category-budget.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import {
  pickSeedableSuggestions,
  suggestCategoryBudgets,
} from '@/lib/domain/financial/category-budgets';
import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import {
  loadCategoryBudgets,
  upsertLocalCategoryBudget,
  upsertLocalCategoryBudgets,
} from '@/lib/data/category-budgets-storage';
import { isSupabaseEnabled } from '@/lib/supabase/config';
import * as supabaseCategoryBudgets from '@/lib/supabase/category-budgets';

export async function fetchCategoryBudgetsForUser(userId: string): Promise<CategoryBudget[]> {
  if (!userId) return [];
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    return loadCategoryBudgets(userId);
  }

  try {
    return await supabaseCategoryBudgets.fetchCategoryBudgets();
  } catch {
    return loadCategoryBudgets(userId);
  }
}

export async function upsertCategoryBudgetForUser(
  userId: string,
  input: { category: string; monthlyLimit: number; source?: CategoryBudgetSource },
): Promise<CategoryBudget> {
  if (!userId) throw new Error('Sessão expirada.');

  const payload = {
    category: input.category,
    monthlyLimit: input.monthlyLimit,
    source: input.source ?? ('manual' as const),
  };

  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    return upsertLocalCategoryBudget(userId, payload);
  }

  try {
    const saved = await supabaseCategoryBudgets.upsertCategoryBudget(payload);
    await upsertLocalCategoryBudget(userId, {
      category: saved.category,
      monthlyLimit: saved.monthlyLimit,
      source: saved.source,
    });
    return saved;
  } catch {
    return upsertLocalCategoryBudget(userId, payload);
  }
}

export async function seedSuggestedCategoryBudgetsForUser(
  userId: string,
  transactions: Transaction[],
  asOf: Date = new Date(),
): Promise<CategoryBudget[]> {
  if (!userId) return [];

  const existing = await fetchCategoryBudgetsForUser(userId);
  const suggestions = pickSeedableSuggestions(existing, suggestCategoryBudgets(transactions, asOf));
  if (suggestions.length === 0) return existing;

  const toInsert = suggestions.map((item) => ({
    category: item.category,
    monthlyLimit: item.monthlyLimit,
    source: 'suggested' as const,
  }));

  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    return upsertLocalCategoryBudgets(userId, toInsert);
  }

  try {
    await supabaseCategoryBudgets.upsertCategoryBudgets(toInsert);
    return fetchCategoryBudgetsForUser(userId);
  } catch {
    return upsertLocalCategoryBudgets(userId, toInsert);
  }
}
