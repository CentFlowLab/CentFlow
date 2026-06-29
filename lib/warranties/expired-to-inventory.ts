import { formatDateShort } from '@/lib/utils/format';
import type { Warranty } from '@/lib/domain/assets.types';
import type { InventoryItem } from '@/lib/domain/types';
import { toIsoDateString } from '@/lib/utils/format';

import { isMockAuthEnabled } from '@/lib/auth';
import { fetchMockAssets, createMockInventoryItem, markMockWarrantyMovedToInventory } from '@/lib/api/mock-assets';
import { isSupabaseEnabled } from '@/lib/supabase';
import { getSupabaseClient } from '@/lib/supabase/client';

export type MovedWarrantyResult = {
  productName: string;
  expiredAt: string;
};

export type MoveExpiredWarrantiesResult = {
  moved: MovedWarrantyResult[];
};

function isExpired(expiresAt: string): boolean {
  const today = toIsoDateString(new Date());
  return expiresAt <= today;
}

async function moveMockExpiredWarranties(): Promise<MoveExpiredWarrantiesResult> {
  const assets = await fetchMockAssets();
  const moved: MovedWarrantyResult[] = [];

  for (const warranty of assets.warranties) {
    if (warranty.movedToInventory || !isExpired(warranty.expiresAt)) continue;

    await createMockInventoryItem({
      name: warranty.product,
      value: 0,
      category: 'garantia',
      description: `Garantia expirada em ${formatDateShort(warranty.expiresAt)}`,
      sourceWarrantyId: warranty.id,
      warrantyExpiredAt: warranty.expiresAt,
    });

    await markMockWarrantyMovedToInventory(warranty.id);

    moved.push({ productName: warranty.product, expiredAt: warranty.expiresAt });
  }

  return { moved };
}

async function moveSupabaseExpiredWarranties(): Promise<MoveExpiredWarrantiesResult> {
  const supabase = getSupabaseClient();
  const today = toIsoDateString(new Date());

  const { data: expired, error } = await supabase
    .from('warranties')
    .select('*')
    .lte('expires_at', today)
    .eq('moved_to_inventory' as 'product', false as never);

  if (error) throw new Error(error.message);

  const moved: MovedWarrantyResult[] = [];

  for (const row of expired ?? []) {
    const { error: insertError } = await supabase.from('inventory_items').insert({
      user_id: row.user_id,
      name: row.product,
      value: 0,
      category: 'garantia',
      description: `Garantia expirada em ${formatDateShort(row.expires_at)}`,
      source_warranty_id: row.id,
      warranty_expired_at: row.expires_at,
    } as never);

    if (insertError) continue;

    await supabase
      .from('warranties')
      .update({ moved_to_inventory: true } as never)
      .eq('id', row.id);

    moved.push({ productName: row.product, expiredAt: row.expires_at });
  }

  return { moved };
}

export async function moveExpiredWarrantiesToInventory(): Promise<MoveExpiredWarrantiesResult> {
  if (isMockAuthEnabled()) return moveMockExpiredWarranties();
  if (isSupabaseEnabled()) return moveSupabaseExpiredWarranties();
  return { moved: [] };
}

export function filterActiveWarranties(warranties: Warranty[]): Warranty[] {
  const today = toIsoDateString(new Date());
  return warranties.filter((w) => !w.movedToInventory && w.expiresAt > today);
}

export function findWarrantyForInventoryItem(
  item: InventoryItem,
  warranties: Warranty[],
): Warranty | undefined {
  if (!item.sourceWarrantyId) return undefined;
  return warranties.find((w) => w.id === item.sourceWarrantyId);
}
