import {
  createMockGoal,
  createMockInventoryItem,
  createMockWarranty,
  deleteMockGoal,
  deleteMockInventoryItem,
  deleteMockWarranty,
  fetchMockAssets,
  updateMockGoal,
} from '@/lib/api/mock-assets';
import { isMockAuthEnabled } from '@/lib/auth';
import type {
  AssetsData,
  Goal,
  Warranty,
} from '@/lib/domain/assets.types';
import type {
  CreateGoalInput,
  CreateInventoryItemInput,
  CreateWarrantyInput,
  UpdateGoalInput,
} from '@/lib/domain/assets.schema';
import type { InventoryItem } from '@/lib/domain/types';
import { isSupabaseEnabled, supabaseAssets } from '@/lib/supabase';

export async function fetchAssetsData(): Promise<AssetsData> {
  if (isMockAuthEnabled()) {
    return fetchMockAssets();
  }

  if (isSupabaseEnabled()) {
    try {
      return await supabaseAssets.fetchAssets();
    } catch {
      return { goals: [], warranties: [], inventory: [] };
    }
  }

  return { goals: [], warranties: [], inventory: [] };
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  if (isMockAuthEnabled()) return createMockGoal(input);
  if (isSupabaseEnabled()) return supabaseAssets.createGoal(input);
  throw new Error('Backend de ativos indisponível');
}

export async function updateGoal(id: string, input: UpdateGoalInput): Promise<Goal> {
  if (isMockAuthEnabled()) return updateMockGoal(id, input);
  if (isSupabaseEnabled()) return supabaseAssets.updateGoal(id, input);
  throw new Error('Backend de ativos indisponível');
}

export async function createWarranty(input: CreateWarrantyInput): Promise<Warranty> {
  if (isMockAuthEnabled()) return createMockWarranty(input);
  if (isSupabaseEnabled()) return supabaseAssets.createWarranty(input);
  throw new Error('Backend de ativos indisponível');
}

export async function createInventoryItem(
  input: CreateInventoryItemInput,
): Promise<InventoryItem> {
  if (isMockAuthEnabled()) return createMockInventoryItem(input);
  if (isSupabaseEnabled()) return supabaseAssets.createInventoryItem(input);
  throw new Error('Backend de ativos indisponível');
}

export async function deleteGoal(id: string): Promise<void> {
  if (isMockAuthEnabled()) return deleteMockGoal(id);
  if (isSupabaseEnabled()) return supabaseAssets.deleteGoal(id);
  throw new Error('Backend de ativos indisponível');
}

export async function deleteWarranty(id: string): Promise<void> {
  if (isMockAuthEnabled()) return deleteMockWarranty(id);
  if (isSupabaseEnabled()) return supabaseAssets.deleteWarranty(id);
  throw new Error('Backend de ativos indisponível');
}

export async function deleteInventoryItem(id: string): Promise<void> {
  if (isMockAuthEnabled()) return deleteMockInventoryItem(id);
  if (isSupabaseEnabled()) return supabaseAssets.deleteInventoryItem(id);
  throw new Error('Backend de ativos indisponível');
}
