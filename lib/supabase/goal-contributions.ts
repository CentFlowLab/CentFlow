import type { GoalContribution } from '@/lib/domain/goal-contribution.types';

import type { TablesInsert } from './database.types';

import { getSupabaseClient } from './client';

type GoalContributionRow = {
  id: string;
  goal_id: string;
  account_id: string | null;
  amount: number;
  note: string | null;
  created_at: string;
};

function mapRow(row: GoalContributionRow): GoalContribution {
  return {
    id: row.id,
    goalId: row.goal_id,
    accountId: row.account_id ?? undefined,
    amount: Number(row.amount),
    note: row.note ?? undefined,
    createdAt: row.created_at,
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

export async function fetchGoalContributions(): Promise<GoalContribution[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('goal_contributions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as GoalContributionRow));
}

export async function createGoalContribution(input: {
  goalId: string;
  accountId: string;
  amount: number;
  note?: string;
}): Promise<GoalContribution> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();

  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('id, current, target')
    .eq('id', input.goalId)
    .single();

  if (goalError || !goal) throw new Error('Objetivo não encontrado');

  const payload: TablesInsert<'goal_contributions'> = {
    user_id: userId,
    goal_id: input.goalId,
    account_id: input.accountId,
    amount: input.amount,
    note: input.note ?? null,
  };

  const { data: contribution, error: insertError } = await supabase
    .from('goal_contributions')
    .insert(payload)
    .select('*')
    .single();

  if (insertError) throw new Error(insertError.message);

  const newCurrent = Number(goal.current) + input.amount;
  const { error: updateError } = await supabase
    .from('goals')
    .update({ current: newCurrent })
    .eq('id', input.goalId);

  if (updateError) throw new Error(updateError.message);

  return mapRow(contribution as GoalContributionRow);
}
