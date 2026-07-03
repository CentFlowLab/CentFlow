import type { CashTransactionType } from '@/lib/domain/transaction.types';
import {
  DEFAULT_CATEGORY_EMOJI,
  getAutoEmoji,
  resolveCategoryEmoji,
} from '@/lib/categories/emoji-map';
import { readUserJson, writeUserJson } from '@/lib/storage/local-flags';

const SCOPE = 'custom_categories';

export const CATEGORY_COLOR_OPTIONS = [
  '#6366F1',
  '#EC4899',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#3B82F6',
  '#A855F7',
] as const;

export type CustomCategory = {
  name: string;
  emoji: string;
  color: string;
  /** Utilizador escolheu emoji manualmente — não sobrescrever ao renomear. */
  emojiManual?: boolean;
};

type StoredCustomCategories = {
  expense: CustomCategory[];
  income: CustomCategory[];
};

function emptyStore(): StoredCustomCategories {
  return { expense: [], income: [] };
}

function normalizeCategory(raw: unknown): CustomCategory | null {
  if (typeof raw === 'string') {
    const name = raw.trim();
    if (!name) return null;
    return {
      name,
      emoji: getAutoEmoji(name) ?? DEFAULT_CATEGORY_EMOJI,
      color: CATEGORY_COLOR_OPTIONS[0],
    };
  }
  if (raw && typeof raw === 'object' && 'name' in raw) {
    const record = raw as Partial<CustomCategory>;
    const name = String(record.name ?? '').trim();
    if (!name) return null;
    return {
      name,
      emoji: record.emoji?.trim() || getAutoEmoji(name) || DEFAULT_CATEGORY_EMOJI,
      color: record.color ?? CATEGORY_COLOR_OPTIONS[0],
      emojiManual: record.emojiManual,
    };
  }
  return null;
}

function normalizeList(list: unknown): CustomCategory[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: CustomCategory[] = [];
  for (const item of list) {
    const category = normalizeCategory(item);
    if (!category) continue;
    const key = category.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(category);
  }
  return result;
}

async function readStore(userId: string): Promise<StoredCustomCategories> {
  const stored = await readUserJson<StoredCustomCategories>(SCOPE, userId);
  if (!stored) return emptyStore();
  return {
    expense: normalizeList(stored.expense),
    income: normalizeList(stored.income),
  };
}

async function writeStore(userId: string, store: StoredCustomCategories): Promise<void> {
  await writeUserJson<StoredCustomCategories>(SCOPE, userId, store);
}

export async function loadCustomCategories(
  userId: string,
  type: CashTransactionType,
): Promise<CustomCategory[]> {
  const stored = await readStore(userId);
  return stored[type];
}

export async function addCustomCategory(
  userId: string,
  type: CashTransactionType,
  name: string,
  options?: { emoji?: string; color?: string; emojiManual?: boolean },
): Promise<CustomCategory> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Nome inválido');

  const stored = await readStore(userId);
  const list = stored[type];
  const existing = list.find((item) => item.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;

  const emojiManual = options?.emojiManual ?? Boolean(options?.emoji);
  const category: CustomCategory = {
    name: trimmed,
    emoji:
      options?.emoji?.trim() ||
      getAutoEmoji(trimmed) ||
      DEFAULT_CATEGORY_EMOJI,
    color: options?.color ?? CATEGORY_COLOR_OPTIONS[0],
    emojiManual,
  };

  await writeStore(userId, {
    ...stored,
    [type]: [category, ...list],
  });

  return category;
}

export async function updateCustomCategory(
  userId: string,
  type: CashTransactionType,
  oldName: string,
  patch: { name: string; emoji: string; color: string; emojiManual?: boolean },
): Promise<CustomCategory> {
  const stored = await readStore(userId);
  const list = stored[type];
  const index = list.findIndex((item) => item.name.toLowerCase() === oldName.toLowerCase());
  if (index < 0) throw new Error('Categoria não encontrada');

  const nextName = patch.name.trim();
  if (!nextName) throw new Error('Nome inválido');

  const duplicate = list.find(
    (item, i) => i !== index && item.name.toLowerCase() === nextName.toLowerCase(),
  );
  if (duplicate) throw new Error('Já existe uma categoria com este nome');

  const updated: CustomCategory = {
    name: nextName,
    emoji: patch.emoji.trim() || resolveCategoryEmoji(nextName),
    color: patch.color,
    emojiManual: patch.emojiManual,
  };

  const nextList = [...list];
  nextList[index] = updated;

  await writeStore(userId, { ...stored, [type]: nextList });
  return updated;
}

export async function deleteCustomCategory(
  userId: string,
  type: CashTransactionType,
  name: string,
): Promise<void> {
  const stored = await readStore(userId);
  const list = stored[type].filter((item) => item.name.toLowerCase() !== name.toLowerCase());
  await writeStore(userId, { ...stored, [type]: list });
}

export function suggestEmojiForCategoryName(name: string, currentEmoji?: string, emojiManual?: boolean) {
  if (emojiManual && currentEmoji) return currentEmoji;
  return getAutoEmoji(name) ?? currentEmoji ?? DEFAULT_CATEGORY_EMOJI;
}

export { resolveCategoryEmoji, getAutoEmoji, DEFAULT_CATEGORY_EMOJI };
