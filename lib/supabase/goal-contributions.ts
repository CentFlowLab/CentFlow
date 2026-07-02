import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import { traceGoalContribution } from '@/lib/doctor/goal-contribution-trace';

import type { TablesInsert } from './database.types';

import { getSupabaseClient } from './client';

type GoalContributionRow = {
  id: string;
  goal_id: string;
  account_id: string | null;
  amount: number;
  kind: string | null;
  note: string | null;
  created_at: string;
};

function mapRow(row: GoalContributionRow): GoalContribution {
  return {
    id: row.id,
    goalId: row.goal_id,
    accountId: row.account_id ?? undefined,
    amount: Number(row.amount),
    kind: (row.kind as GoalContribution['kind']) ?? 'contribution',
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
  traceGoalContribution('service_start', {
    goalId: input.goalId,
    accountId: input.accountId,
    amount: input.amount,
  });

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
    kind: 'contribution',
    note: input.note ?? null,
  };

  const { data: contribution, error: insertError } = await supabase
    .from('goal_contributions')
    .insert(payload)
    .select('*')
    .single();

  if (insertError) {
    traceGoalContribution('service_insert_error', { code: insertError.code }, 'error');
    throw new Error(insertError.message);
  }

  const newCurrent = Number(goal.current) + input.amount;
  const { error: updateError } = await supabase
    .from('goals')
    .update({ current: newCurrent })
    .eq('id', input.goalId);

  if (updateError) {
    traceGoalContribution('service_goal_update_error', { code: updateError.code }, 'error');
    throw new Error(updateError.message);
  }

  traceGoalContribution('service_success', { goalId: input.goalId, newCurrent });
  return mapRow(contribution as GoalContributionRow);
}

export async function createGoalWithdrawal(input: {
  goalId: string;
  accountId: string;
  amount: number;
  note?: string;
}): Promise<GoalContribution> {
  traceGoalContribution('withdraw_service_start', {
    goalId: input.goalId,
    accountId: input.accountId,
    amount: input.amount,
  });

  const supabase = getSupabaseClient();
  const userId = await getUserId();

  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('id, current, target')
    .eq('id', input.goalId)
    .single();

  if (goalError || !goal) throw new Error('Objetivo não encontrado');
  if (Number(goal.current) < input.amount) {
    throw new Error('Valor superior ao guardado no objetivo.');
  }

  const payload: TablesInsert<'goal_contributions'> = {
    user_id: userId,
    goal_id: input.goalId,
    account_id: input.accountId,
    amount: input.amount,
    kind: 'withdrawal',
    note: input.note ?? null,
  };

  const { data: contribution, error: insertError } = await supabase
    .from('goal_contributions')
    .insert(payload)
    .select('*')
    .single();

  if (insertError) {
    traceGoalContribution('withdraw_insert_error', { code: insertError.code }, 'error');
    throw new Error(insertError.message);
  }

  const newCurrent = Math.max(0, Number(goal.current) - input.amount);
  const { error: updateError } = await supabase
    .from('goals')
    .update({ current: newCurrent })
    .eq('id', input.goalId);

  if (updateError) {
    traceGoalContribution('withdraw_goal_update_error', { code: updateError.code }, 'error');
    throw new Error(updateError.message);
  }

  traceGoalContribution('withdraw_service_success', { goalId: input.goalId, newCurrent });
  return mapRow(contribution as GoalContributionRow);
}
