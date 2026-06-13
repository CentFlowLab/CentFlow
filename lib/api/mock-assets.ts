import { mockGoals, mockInventory, mockWarranties } from '@/lib/data/mocks';
import type {
  AssetsData,
  Goal,
  Warranty,
} from '@/lib/domain/assets.types';
import type { InventoryItem } from '@/lib/domain/types';
import type {
  CreateGoalInput,
  CreateInventoryItemInput,
  CreateWarrantyInput,
} from '@/lib/domain/assets.schema';

let goalsStore: Goal[] = buildSeedGoals();
let warrantiesStore: Warranty[] = buildSeedWarranties();
let inventoryStore: InventoryItem[] = [...mockInventory];
let idCounter = 100;

function buildSeedGoals(): Goal[] {
  return mockGoals.map((g) => ({
    id: g.id,
    name: g.name,
    target: g.target,
    current: g.current,
    currency: 'EUR',
  }));
}

function buildSeedWarranties(): Warranty[] {
  return mockWarranties.map((w) => ({
    id: w.id,
    product: w.product,
    expiresAt: w.expiresAt,
  }));
}

function nextId(prefix: string): string {
  idCounter += 1;
  return `mock-${prefix}-${idCounter}`;
}

export async function fetchMockAssets(): Promise<AssetsData> {
  await new Promise((r) => setTimeout(r, 180));
  return {
    goals: [...goalsStore],
    warranties: [...warrantiesStore],
    inventory: [...inventoryStore],
  };
}

export async function createMockGoal(input: CreateGoalInput): Promise<Goal> {
  await new Promise((r) => setTimeout(r, 200));
  const goal: Goal = {
    id: nextId('goal'),
    name: input.name.trim(),
    target: input.target,
    current: input.current ?? 0,
    currency: 'EUR',
    deadline: input.deadline || undefined,
  };
  goalsStore = [goal, ...goalsStore];
  return goal;
}

export async function createMockWarranty(input: CreateWarrantyInput): Promise<Warranty> {
  await new Promise((r) => setTimeout(r, 200));
  const warranty: Warranty = {
    id: nextId('war'),
    product: input.product.trim(),
    expiresAt: input.expiresAt,
    store: input.store?.trim() || undefined,
  };
  warrantiesStore = [warranty, ...warrantiesStore];
  return warranty;
}

export async function createMockInventoryItem(
  input: CreateInventoryItemInput,
): Promise<InventoryItem> {
  await new Promise((r) => setTimeout(r, 200));
  const item: InventoryItem = {
    id: nextId('inv'),
    name: input.name.trim(),
    value: input.value,
    category: input.category?.trim() || undefined,
  };
  inventoryStore = [item, ...inventoryStore];
  return item;
}

export async function deleteMockGoal(id: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 150));
  goalsStore = goalsStore.filter((g) => g.id !== id);
}

export async function deleteMockWarranty(id: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 150));
  warrantiesStore = warrantiesStore.filter((w) => w.id !== id);
}

export async function deleteMockInventoryItem(id: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 150));
  inventoryStore = inventoryStore.filter((i) => i.id !== id);
}
