import type { CurrencyCode } from '../money';
import type { CalendarDate } from './dates';

/** UUID v4 em texto. Gerado no cliente para ser estável na sincronização futura. */
export type Id = string;

/** Instante ISO 8601 em UTC (ex.: "2026-11-08T12:00:00.000Z"). */
export type Timestamp = string;

export const ACCOUNT_TYPES = ['bank', 'cash', 'savings', 'card', 'investment', 'custom'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const CATEGORY_TYPES = ['expense', 'income'] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const ENTRY_TYPES = ['expense', 'income', 'transfer'] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

type SyncMetadata = {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Account = SyncMetadata & {
  id: Id;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  /** Unidades mínimas; pode ser negativo (ex.: dívida de cartão). */
  initialBalance: number;
  archivedAt: Timestamp | null;
};

export type Category = SyncMetadata & {
  id: Id;
  name: string;
  type: CategoryType;
  /** Nome do ícone (conjunto Ionicons). */
  icon: string;
  /** Chave da paleta de categorias (ex.: "indigo"), não um valor hexadecimal. */
  color: string;
};

export type Entry = SyncMetadata & {
  id: Id;
  type: EntryType;
  /** Sempre positivo, em unidades mínimas; o tipo define o sentido. */
  amount: number;
  description: string;
  categoryId: Id | null;
  accountId: Id;
  destinationAccountId: Id | null;
  date: CalendarDate;
  notes: string | null;
};

export type AccountInput = Pick<Account, 'name' | 'type' | 'currency' | 'initialBalance'>;
export type CategoryInput = Pick<Category, 'name' | 'type' | 'icon' | 'color'>;
export type EntryInput = Pick<
  Entry,
  | 'type'
  | 'amount'
  | 'description'
  | 'categoryId'
  | 'accountId'
  | 'destinationAccountId'
  | 'date'
  | 'notes'
>;
