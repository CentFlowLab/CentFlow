import type {
  CategoryBudget,
  CategoryBudgetSource,
} from '@/lib/domain/category-budget.types';

import type { TablesInsert } from './database.types';

import { getSupabaseClient } from './client';

type CategoryBudgetRow = {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  source: CategoryBudgetSource;
  created_at: string;
  updated_at: string;
};

function mapRow(row: CategoryBudgetRow): CategoryBudget {
  return {
    id: row.id,
    category: row.category,
    monthlyLimit: Number(row.monthly_limit),
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Utilizador não autenticado');
  return user.id;
}

export async function fetchCategoryBudgets(): Promise<CategoryBudget[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('category_budgets')
    .select('*')
    .order('category', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as CategoryBudgetRow));
}

export async function upsertCategoryBudget(input: {
  category: string;
  monthlyLimit: number;
  source: CategoryBudgetSource;
}): Promise<CategoryBudget> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();

  const payload: TablesInsert<'category_budgets'> = {
    user_id: userId,
    category: input.category,
    monthly_limit: input.monthlyLimit,
    source: input.source,
  };

  const { data, error } = await supabase
    .from('category_budgets')
    .upsert(payload, { onConflict: 'user_id,category' })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as CategoryBudgetRow);
}

export async function upsertCategoryBudgets(
  inputs: Array<{ category: string; monthlyLimit: number; source: CategoryBudgetSource }>,
): Promise<CategoryBudget[]> {
  if (inputs.length === 0) return fetchCategoryBudgets();

  const supabase = getSupabaseClient();
  const userId = await getUserId();

  const payload: TablesInsert<'category_budgets'>[] = inputs.map((input) => ({
    user_id: userId,
    category: input.category,
    monthly_limit: input.monthlyLimit,
    source: input.source,
  }));

  const { error } = await supabase
    .from('category_budgets')
    .upsert(payload, { onConflict: 'user_id,category' });

  if (error) throw new Error(error.message);
  return fetchCategoryBudgets();
}
