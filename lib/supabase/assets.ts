import type {
  AssetsData,
  Goal,
  Warranty,
} from '@/lib/domain/assets.types';
import type {
  CreateGoalInput,
  CreateInventoryItemInput,
  CreateWarrantyInput,
  UpdateInventoryItemInput,
  UpdateWarrantyInput,
} from '@/lib/domain/assets.schema';
import type { InventoryItem } from '@/lib/domain/types';

import type { TablesInsert } from './database.types';

import { getSupabaseClient } from './client';

type GoalRow = {
  id: string;
  name: string;
  target: number;
  current: number;
  currency: string;
  deadline: string | null;
  category: string | null;
};

type WarrantyRow = {
  id: string;
  product: string;
  expires_at: string;
  purchase_date: string | null;
  store: string | null;
  notes: string | null;
  receipt_transaction_id: string | null;
  receipt_id: string | null;
  receipt_label: string | null;
  moved_to_inventory?: boolean;
  receipt_url?: string | null;
};

type InventoryRow = {
  id: string;
  name: string;
  value: number;
  category: string | null;
  description?: string | null;
  source_warranty_id?: string | null;
  warranty_expired_at?: string | null;
  receipt_url?: string | null;
};

function mapGoalRow(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    target: Number(row.target),
    current: Number(row.current),
    currency: row.currency ?? 'EUR',
    deadline: row.deadline ?? undefined,
    category: row.category ?? undefined,
  };
}

function mapWarrantyRow(row: WarrantyRow): Warranty {
  return {
    id: row.id,
    product: row.product,
    expiresAt: row.expires_at,
    purchaseDate: row.purchase_date ?? undefined,
    store: row.store ?? undefined,
    notes: row.notes ?? undefined,
    receiptTransactionId: row.receipt_transaction_id ?? undefined,
    receiptId: row.receipt_id ?? undefined,
    receiptLabel: row.receipt_label ?? undefined,
    receiptUrl: row.receipt_url ?? undefined,
    movedToInventory: row.moved_to_inventory ?? false,
  };
}

function mapInventoryRow(row: InventoryRow): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    value: Number(row.value),
    category: row.category ?? undefined,
    description: row.description ?? undefined,
    sourceWarrantyId: row.source_warranty_id ?? undefined,
    warrantyExpiredAt: row.warranty_expired_at ?? undefined,
    receiptUrl: row.receipt_url ?? undefined,
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

export async function fetchAssets(): Promise<AssetsData> {
  const supabase = getSupabaseClient();

  const [goalsRes, warrantiesRes, inventoryRes] = await Promise.all([
    supabase.from('goals').select('*').order('created_at', { ascending: false }),
    supabase.from('warranties').select('*').order('expires_at', { ascending: true }),
    supabase.from('inventory_items').select('*').order('created_at', { ascending: false }),
  ]);

  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (warrantiesRes.error) throw new Error(warrantiesRes.error.message);
  if (inventoryRes.error) throw new Error(inventoryRes.error.message);

  return {
    goals: (goalsRes.data ?? []).map((row) => mapGoalRow(row as GoalRow)),
    warranties: (warrantiesRes.data ?? []).map((row) => mapWarrantyRow(row as WarrantyRow)),
    inventory: (inventoryRes.data ?? []).map((row) => mapInventoryRow(row as InventoryRow)),
    credits: [],
    subscriptions: [],
  };
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      name: input.name.trim(),
      target: input.target,
      current: input.current ?? 0,
      deadline: input.deadline || null,
    } satisfies TablesInsert<'goals'>)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapGoalRow(data as GoalRow);
}

export async function updateGoal(id: string, input: CreateGoalInput): Promise<Goal> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('goals')
    .update({
      name: input.name.trim(),
      target: input.target,
      current: input.current ?? 0,
      deadline: input.deadline || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapGoalRow(data as GoalRow);
}

export async function createWarranty(input: CreateWarrantyInput): Promise<Warranty> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('warranties')
    .insert({
      user_id: userId,
      product: input.product.trim(),
      expires_at: input.expiresAt,
      store: input.store?.trim() || null,
      purchase_date: input.purchaseDate || null,
      receipt_transaction_id: input.receiptTransactionId || null,
      receipt_id: input.receiptId || null,
      receipt_label: input.receiptLabel?.trim() || null,
    } satisfies TablesInsert<'warranties'>)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapWarrantyRow(data as WarrantyRow);
}

export async function createInventoryItem(
  input: CreateInventoryItemInput,
): Promise<InventoryItem> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      user_id: userId,
      name: input.name.trim(),
      value: input.value,
      category: input.category?.trim() || null,
    } satisfies TablesInsert<'inventory_items'>)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapInventoryRow(data as InventoryRow);
}

export async function updateWarranty(id: string, input: UpdateWarrantyInput): Promise<Warranty> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('warranties')
    .update({
      product: input.product.trim(),
      expires_at: input.expiresAt,
      store: input.store?.trim() || null,
      purchase_date: input.purchaseDate || null,
      receipt_transaction_id: input.receiptTransactionId || null,
      receipt_id: input.receiptId || null,
      receipt_label: input.receiptLabel?.trim() || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapWarrantyRow(data as WarrantyRow);
}

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItemInput,
): Promise<InventoryItem> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('inventory_items')
    .update({
      name: input.name.trim(),
      value: input.value,
      category: input.category?.trim() || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapInventoryRow(data as InventoryRow);
}

export async function deleteGoal(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteWarranty(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('warranties').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('inventory_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
