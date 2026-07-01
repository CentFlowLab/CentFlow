import type { InventoryItem } from './types';
import type { Credit } from './types';

export type AssetsTab = 'objetivos' | 'garantias' | 'inventario' | 'contas';

export type MovementsView = 'movimentos' | 'subscricoes';

export type SubscriptionBillingInterval = 'monthly' | 'quarterly' | 'annual';

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  billingInterval?: SubscriptionBillingInterval;
  renewsAt?: string;
  category?: string;
  notes?: string;
};

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
  /** Movimento com talão associado */
  receiptTransactionId?: string;
  receiptId?: string;
  /** Rótulo para UI (descrição do movimento/talão) */
  receiptLabel?: string;
};

export type AssetsData = {
  goals: Goal[];
  warranties: Warranty[];
  inventory: InventoryItem[];
  credits: Credit[];
  subscriptions: Subscription[];
};

export type AssetsCounts = {
  goals: number;
  warranties: number;
  inventory: number;
  accounts: number;
};
