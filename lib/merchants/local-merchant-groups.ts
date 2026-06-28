import { readUserJson, writeUserJson } from '@/lib/storage/local-flags';
import type {
  CreateMerchantGroupInput,
  MerchantGroup,
  UpdateMerchantGroupInput,
} from '@/lib/domain/merchant-group.types';

const SCOPE = 'merchant_groups';

type LocalStore = {
  groups: MerchantGroup[];
  movementGroups: Record<string, string>;
};

function newId(): string {
  return `local-mg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function loadStore(userId: string): Promise<LocalStore> {
  return (await readUserJson<LocalStore>(SCOPE, userId)) ?? { groups: [], movementGroups: {} };
}

async function saveStore(userId: string, store: LocalStore): Promise<void> {
  await writeUserJson(SCOPE, userId, store);
}

export async function fetchLocalMerchantGroups(userId: string): Promise<MerchantGroup[]> {
  const store = await loadStore(userId);
  return store.groups;
}

export async function createLocalMerchantGroup(
  userId: string,
  input: CreateMerchantGroupInput,
): Promise<MerchantGroup> {
  const store = await loadStore(userId);
  const now = new Date().toISOString();
  const group: MerchantGroup = {
    id: newId(),
    name: input.name.trim(),
    aliases: input.aliases,
    category: input.category ?? null,
    createdAt: now,
    updatedAt: now,
  };
  store.groups.push(group);

  for (const movementId of input.movementIds ?? []) {
    store.movementGroups[movementId] = group.id;
  }

  await saveStore(userId, store);
  return group;
}

export async function updateLocalMerchantGroup(
  userId: string,
  groupId: string,
  input: UpdateMerchantGroupInput,
): Promise<MerchantGroup> {
  const store = await loadStore(userId);
  const index = store.groups.findIndex((g) => g.id === groupId);
  if (index < 0) throw new Error('Grupo não encontrado');

  const current = store.groups[index]!;
  const updated: MerchantGroup = {
    ...current,
    name: input.name?.trim() ?? current.name,
    aliases: input.aliases ?? current.aliases,
    category: input.category !== undefined ? input.category : current.category,
    updatedAt: new Date().toISOString(),
  };
  store.groups[index] = updated;
  await saveStore(userId, store);
  return updated;
}

export async function deleteLocalMerchantGroup(userId: string, groupId: string): Promise<void> {
  const store = await loadStore(userId);
  store.groups = store.groups.filter((g) => g.id !== groupId);
  for (const [movementId, gid] of Object.entries(store.movementGroups)) {
    if (gid === groupId) delete store.movementGroups[movementId];
  }
  await saveStore(userId, store);
}

export async function assignMovementsToLocalGroup(
  userId: string,
  groupId: string,
  movementIds: string[],
  aliasesToMerge?: string[],
): Promise<void> {
  const store = await loadStore(userId);
  const group = store.groups.find((g) => g.id === groupId);
  if (!group) throw new Error('Grupo não encontrado');

  if (aliasesToMerge?.length) {
    group.aliases = Array.from(new Set([...group.aliases, ...aliasesToMerge]));
    group.updatedAt = new Date().toISOString();
  }

  for (const movementId of movementIds) {
    store.movementGroups[movementId] = groupId;
  }

  await saveStore(userId, store);
}

export async function addMovementToLocalGroup(
  userId: string,
  groupId: string,
  movementId: string,
  alias: string,
): Promise<MerchantGroup> {
  await assignMovementsToLocalGroup(userId, groupId, [movementId], [alias]);
  const store = await loadStore(userId);
  const group = store.groups.find((g) => g.id === groupId);
  if (!group) throw new Error('Grupo não encontrado');
  return group;
}

export async function unassignLocalMovementFromGroup(
  userId: string,
  movementId: string,
): Promise<void> {
  const store = await loadStore(userId);
  delete store.movementGroups[movementId];
  await saveStore(userId, store);
}

export async function getLocalMovementGroupId(
  userId: string,
  movementId: string,
): Promise<string | null> {
  const store = await loadStore(userId);
  return store.movementGroups[movementId] ?? null;
}

export async function enrichTransactionsWithLocalGroups<
  T extends { id: string; merchantGroupId?: string | null },
>(userId: string, transactions: T[]): Promise<T[]> {
  const store = await loadStore(userId);
  return transactions.map((tx) => ({
    ...tx,
    merchantGroupId: store.movementGroups[tx.id] ?? tx.merchantGroupId ?? null,
  }));
}
