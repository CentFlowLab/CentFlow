export type CategoryBudgetSource = 'suggested' | 'manual';

export type CategoryBudget = {
  id: string;
  category: string;
  monthlyLimit: number;
  source: CategoryBudgetSource;
  createdAt?: string;
  updatedAt?: string;
};

export type CategoryBudgetLevel = 'ok' | 'warn80' | 'over100';

export type CategoryBudgetStatus = {
  category: string;
  label: string;
  monthlyLimit: number;
  spent: number;
  ratio: number;
  level: CategoryBudgetLevel;
  source: CategoryBudgetSource;
};

export type SuggestedCategoryBudget = {
  category: string;
  label: string;
  monthlyLimit: number;
  monthsWithSpend: number;
};
