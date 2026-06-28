import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import type {
  CreateMerchantGroupInput,
  MerchantGroup,
  MerchantGroupWithStats,
  UpdateMerchantGroupInput,
} from '@/lib/domain/merchant-group.types';
import { getSupabaseClient, isSupabaseEnabled } from '@/lib/supabase';

import {
  createLocalMerchantGroup,
  deleteLocalMerchantGroup,
  fetchLocalMerchantGroups,
  updateLocalMerchantGroup,
  addMovementToLocalGroup,
  assignMovementsToLocalGroup,
  unassignLocalMovementFromGroup,
} from './local-merchant-groups';

type MerchantGroupRow = {
  id: string;
  user_id: string;
  name: string;
  aliases: string[];
  category: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: MerchantGroupRow): MerchantGroup {
  return {
    id: row.id,
    name: row.name,
    aliases: row.aliases ?? [],
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchGroupsFromSupabase(userId: string): Promise<MerchantGroup[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('merchant_groups')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as MerchantGroupRow));
}

export async function fetchMerchantGroups(userId: string): Promise<MerchantGroup[]> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    return fetchLocalMerchantGroups(userId);
  }
  try {
    return await fetchGroupsFromSupabase(userId);
  } catch {
    return fetchLocalMerchantGroups(userId);
  }
}

export async function createMerchantGroup(
  userId: string,
  input: CreateMerchantGroupInput,
): Promise<MerchantGroup> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    return createLocalMerchantGroup(userId, input);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('merchant_groups')
    .insert({
      user_id: userId,
      name: input.name.trim(),
      aliases: input.aliases,
      category: input.category ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  const group = mapRow(data as MerchantGroupRow);

  if (input.movementIds?.length) {
    await assignMovementsToGroup(userId, group.id, input.movementIds, input.aliases);
  }

  return group;
}

export async function updateMerchantGroup(
  userId: string,
  groupId: string,
  input: UpdateMerchantGroupInput,
): Promise<MerchantGroup> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    return updateLocalMerchantGroup(userId, groupId, input);
  }

  const supabase = getSupabaseClient();
  const patch: {
    name?: string;
    aliases?: string[];
    category?: string | null;
  } = {};
  if (input.name != null) patch.name = input.name.trim();
  if (input.aliases != null) patch.aliases = input.aliases;
  if (input.category !== undefined) patch.category = input.category;

  const { data, error } = await supabase
    .from('merchant_groups')
    .update(patch)
    .eq('id', groupId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as MerchantGroupRow);
}

export async function deleteMerchantGroup(userId: string, groupId: string): Promise<void> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    await deleteLocalMerchantGroup(userId, groupId);
    return;
  }

  const supabase = getSupabaseClient();
  await supabase
    .from('transactions')
    .update({ merchant_group_id: null })
    .eq('merchant_group_id', groupId)
    .eq('user_id', userId);

  const { error } = await supabase
    .from('merchant_groups')
    .delete()
    .eq('id', groupId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

export async function assignMovementsToGroup(
  userId: string,
  groupId: string,
  movementIds: string[],
  aliasesToMerge?: string[],
): Promise<void> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    await assignMovementsToLocalGroup(userId, groupId, movementIds, aliasesToMerge);
    return;
  }

  const supabase = getSupabaseClient();

  if (aliasesToMerge?.length) {
    const { data: group } = await supabase
      .from('merchant_groups')
      .select('aliases')
      .eq('id', groupId)
      .eq('user_id', userId)
      .single();

    if (group) {
      const merged = Array.from(new Set([...(group.aliases ?? []), ...aliasesToMerge]));
      await supabase.from('merchant_groups').update({ aliases: merged }).eq('id', groupId);
    }
  }

  const { error } = await supabase
    .from('transactions')
    .update({ merchant_group_id: groupId })
    .in('id', movementIds)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

export async function addAliasToGroup(
  userId: string,
  groupId: string,
  alias: string,
  movementId: string,
): Promise<MerchantGroup> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    return addMovementToLocalGroup(userId, groupId, movementId, alias);
  }

  const supabase = getSupabaseClient();
  const { data: group, error: fetchError } = await supabase
    .from('merchant_groups')
    .select('*')
    .eq('id', groupId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !group) throw new Error(fetchError?.message ?? 'Grupo não encontrado');

  const aliases = Array.from(new Set([...(group.aliases ?? []), alias.trim()].filter(Boolean)));

  const [{ error: updateGroupError }, { error: txError }] = await Promise.all([
    supabase.from('merchant_groups').update({ aliases }).eq('id', groupId),
    supabase
      .from('transactions')
      .update({ merchant_group_id: groupId })
      .eq('id', movementId)
      .eq('user_id', userId),
  ]);

  if (updateGroupError) throw new Error(updateGroupError.message);
  if (txError) throw new Error(txError.message);

  return mapRow({ ...group, aliases } as MerchantGroupRow);
}

export async function removeAliasFromGroup(
  userId: string,
  groupId: string,
  alias: string,
  movementId: string,
): Promise<MerchantGroup> {
  const groups = await fetchMerchantGroups(userId);
  const group = groups.find((g) => g.id === groupId);
  if (!group) throw new Error('Grupo não encontrado');

  const aliases = group.aliases.filter((a) => a !== alias);
  const updated = await updateMerchantGroup(userId, groupId, { aliases });

  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    await unassignLocalMovementFromGroup(userId, movementId);
  } else {
    const supabase = getSupabaseClient();
    await supabase
      .from('transactions')
      .update({ merchant_group_id: null })
      .eq('id', movementId)
      .eq('user_id', userId);
  }

  return updated;
}

export function computeMerchantGroupStats(
  groups: MerchantGroup[],
  transactions: Array<{
    id: string;
    merchantGroupId?: string | null;
    amount: number;
    type: string;
    date: string;
  }>,
): MerchantGroupWithStats[] {
  return groups
    .map((group) => {
      const related = transactions.filter(
        (tx) => tx.merchantGroupId === group.id && tx.type === 'expense',
      );
      const totalAmount = related.reduce((sum, tx) => sum + tx.amount, 0);
      const sorted = [...related].sort((a, b) => b.date.localeCompare(a.date));
      const last = sorted[0];
      return {
        ...group,
        movementCount: related.length,
        totalAmount,
        lastDate: last?.date,
        lastAmount: last?.amount,
      };
    })
    .filter((g) => g.movementCount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount);
}
