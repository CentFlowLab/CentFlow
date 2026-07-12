import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import { traceGoalContribution } from '@/lib/doctor/goal-contribution-trace';

import { calculateAccountBalance } from '@/lib/domain/financial/accounts';
import { validateGoalContribution } from '@/lib/domain/financial/goals';

import type { TablesInsert } from './database.types';

import { getSupabaseClient } from './client';
import { mapTransactionRow } from './mappers';

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
  accountId?: string;
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

  if (input.accountId) {
    const [{ data: accountRow, error: accountError }, { data: txRows }, { data: contributionRows }] =
      await Promise.all([
        supabase
          .from('accounts')
          .select('id, initial_balance')
          .eq('id', input.accountId)
          .single(),
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('goal_contributions').select('*').eq('user_id', userId),
      ]);

    if (accountError || !accountRow) throw new Error('Conta não encontrada');

    const transactions = (txRows ?? []).map((row) => mapTransactionRow(row));
    const goalContributions = (contributionRows ?? []).map((row) => mapRow(row as GoalContributionRow));
    const accountBalance = calculateAccountBalance({
      account: {
        id: accountRow.id,
        initialBalance: Number(accountRow.initial_balance),
      },
      transactions,
      goalContributions,
    });

    const validation = validateGoalContribution({
      amount: input.amount,
      accountBalance,
    });
    if (!validation.ok) {
      traceGoalContribution('validation_fail', { reason: validation.reason }, 'warn');
      throw new Error(validation.reason);
    }
  } else {
    const validation = validateGoalContribution({ amount: input.amount, accountBalance: Infinity });
    if (!validation.ok) {
      throw new Error(validation.reason);
    }
  }

  const payload: TablesInsert<'goal_contributions'> = {
    user_id: userId,
    goal_id: input.goalId,
    account_id: input.accountId ?? null,
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
  accountId?: string;
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
    account_id: input.accountId ?? null,
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
