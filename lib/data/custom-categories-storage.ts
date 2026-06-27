import type { TransactionType } from '@/lib/domain/transaction.types';
import { readUserJson, writeUserJson } from '@/lib/storage/local-flags';

const SCOPE = 'custom_categories';

type StoredCustomCategories = {
  expense: string[];
  income: string[];
};

function emptyStore(): StoredCustomCategories {
  return { expense: [], income: [] };
}

export async function loadCustomCategories(
  userId: string,
  type: TransactionType,
): Promise<string[]> {
  const stored = await readUserJson<StoredCustomCategories>(SCOPE, userId);
  return stored?.[type] ?? [];
}

export async function addCustomCategory(
  userId: string,
  type: TransactionType,
  label: string,
): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) return;

  const stored = (await readUserJson<StoredCustomCategories>(SCOPE, userId)) ?? emptyStore();
  const list = stored[type] ?? [];
  if (list.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) return;

  await writeUserJson<StoredCustomCategories>(SCOPE, userId, {
    ...emptyStore(),
    ...stored,
    [type]: [trimmed, ...list],
  });
}
