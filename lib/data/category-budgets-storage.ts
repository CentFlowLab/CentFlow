import type { CategoryBudget, CategoryBudgetSource } from '@/lib/domain/category-budget.types';
import { readUserJson, writeUserJson } from '@/lib/storage/local-flags';

const SCOPE = 'category_budgets';

function randomId(): string {
  return `cb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function loadCategoryBudgets(userId: string): Promise<CategoryBudget[]> {
  return (await readUserJson<CategoryBudget[]>(SCOPE, userId)) ?? [];
}

export async function saveCategoryBudgets(
  userId: string,
  budgets: CategoryBudget[],
): Promise<CategoryBudget[]> {
  await writeUserJson(SCOPE, userId, budgets);
  return budgets;
}

export async function upsertLocalCategoryBudget(
  userId: string,
  input: { category: string; monthlyLimit: number; source: CategoryBudgetSource },
): Promise<CategoryBudget> {
  const current = await loadCategoryBudgets(userId);
  const existing = current.find((item) => item.category === input.category);
  const next: CategoryBudget = existing
    ? {
        ...existing,
        monthlyLimit: input.monthlyLimit,
        source: input.source,
        updatedAt: new Date().toISOString(),
      }
    : {
        id: randomId(),
        category: input.category,
        monthlyLimit: input.monthlyLimit,
        source: input.source,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

  const budgets = existing
    ? current.map((item) => (item.category === input.category ? next : item))
    : [...current, next];

  await saveCategoryBudgets(userId, budgets);
  return next;
}

export async function upsertLocalCategoryBudgets(
  userId: string,
  inputs: Array<{ category: string; monthlyLimit: number; source: CategoryBudgetSource }>,
): Promise<CategoryBudget[]> {
  let budgets = await loadCategoryBudgets(userId);
  for (const input of inputs) {
    const existing = budgets.find((item) => item.category === input.category);
    if (existing) {
      budgets = budgets.map((item) =>
        item.category === input.category
          ? {
              ...item,
              monthlyLimit: input.monthlyLimit,
              source: input.source,
              updatedAt: new Date().toISOString(),
            }
          : item,
      );
    } else {
      budgets.push({
        id: randomId(),
        category: input.category,
        monthlyLimit: input.monthlyLimit,
        source: input.source,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }
  return saveCategoryBudgets(userId, budgets);
}
