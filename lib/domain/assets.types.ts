import type { InventoryItem } from './types';

export type AssetsTab = 'objetivos' | 'garantias' | 'inventario';

export type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  currency?: string;
  deadline?: string;
  category?: string;
};

export type Warranty = {
  id: string;
  product: string;
  expiresAt: string;
  purchaseDate?: string;
  store?: string;
  notes?: string;
};

export type AssetsData = {
  goals: Goal[];
  warranties: Warranty[];
  inventory: InventoryItem[];
};

export type AssetsCounts = {
  goals: number;
  warranties: number;
  inventory: number;
};
