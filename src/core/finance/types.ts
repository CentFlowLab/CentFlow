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

/** Um orçamento ativo por categoria: períodos sobrepostos contariam duas vezes a mesma despesa. */
export const BUDGET_PERIODS = ['weekly', 'monthly', 'yearly'] as const;
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

/** Despesa recorrente do utilizador. Não é a subscrição paga do Miven. */
export const SUBSCRIPTION_PERIODS = BUDGET_PERIODS;
export type SubscriptionPeriod = BudgetPeriod;
export const SUBSCRIPTION_STATUSES = ['active', 'paused', 'cancelled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

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
  /** Despesa essencial (casa, saúde…), usada no fundo de emergência quando há alguma marcada. */
  essential: boolean;
};

export type Budget = SyncMetadata & {
  id: Id;
  categoryId: Id;
  /** Limite em unidades mínimas. Sempre positivo. */
  amount: number;
  currency: CurrencyCode;
  period: BudgetPeriod;
  startsOn: CalendarDate;
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
export type CategoryInput = Pick<Category, 'name' | 'type' | 'icon' | 'color'> & {
  /** Sem valor: mantém o que estava (falso numa categoria nova). Só nas despesas. */
  essential?: boolean;
};
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
export type BudgetInput = Pick<
  Budget,
  'categoryId' | 'amount' | 'currency' | 'period' | 'startsOn'
>;

export type Subscription = SyncMetadata & {
  id: Id;
  name: string;
  /** Unidades mínimas. Sempre positivo. */
  amount: number;
  currency: CurrencyCode;
  period: SubscriptionPeriod;
  status: SubscriptionStatus;
  startsOn: CalendarDate;
  nextOn: CalendarDate;
  categoryId: Id | null;
  /** Valor antes da última mudança de preço (mesma moeda). Guardado pela app, não pela pessoa. */
  previousAmount: number | null;
  /** Dia em que o valor mudou pela última vez. */
  amountChangedOn: CalendarDate | null;
};

export type SubscriptionInput = Pick<
  Subscription,
  'name' | 'amount' | 'currency' | 'period' | 'status' | 'startsOn' | 'nextOn' | 'categoryId'
>;

/** Objetivo de poupança. O progresso não é guardado: é a soma das contribuições ativas. */
export type SavingsGoal = SyncMetadata & {
  id: Id;
  name: string;
  /** Alvo em unidades mínimas. Sempre positivo. */
  targetAmount: number;
  currency: CurrencyCode;
  /** Data opcional para atingir o alvo. */
  targetOn: CalendarDate | null;
};

export type SavingsGoalInput = Pick<SavingsGoal, 'name' | 'targetAmount' | 'currency' | 'targetOn'>;

/** Linha própria. Corrigir um engano é apagá-la, não editar o valor. */
export type GoalContribution = SyncMetadata & {
  id: Id;
  goalId: Id;
  /** Unidades mínimas. Sempre positivo. A moeda é a do objetivo. */
  amount: number;
  date: CalendarDate;
};

export type GoalContributionInput = Pick<GoalContribution, 'goalId' | 'amount' | 'date'>;

export const WEALTH_ASSET_TYPES = [
  'property',
  'investment',
  'retirement',
  'valuables',
  'other_asset',
] as const;
export const WEALTH_LIABILITY_TYPES = ['mortgage', 'loan', 'credit', 'other_debt'] as const;
export const WEALTH_TYPES = [...WEALTH_ASSET_TYPES, ...WEALTH_LIABILITY_TYPES] as const;
export type WealthType = (typeof WEALTH_TYPES)[number];

/** Bem ou dívida. O valor é positivo; o sinal vem do tipo. Não altera saldos de contas. */
export type WealthItem = SyncMetadata & {
  id: Id;
  name: string;
  type: WealthType;
  /** Unidades mínimas. Sempre positivo. */
  amount: number;
  currency: CurrencyCode;
  /** Data a que o valor se refere. */
  valuedOn: CalendarDate;
  /** Avaliações anteriores (a mais antiga primeiro), guardadas pela app quando o valor muda. */
  valueHistory: WealthValuation[];
  /** Dia em que foi vendido (bem) ou pago (dívida); conta no histórico até lá. */
  closedOn: CalendarDate | null;
};

export type WealthValuation = { amount: number; valuedOn: CalendarDate };

export type WealthItemInput = Pick<
  WealthItem,
  'name' | 'type' | 'amount' | 'currency' | 'valuedOn'
>;

export const VEHICLE_KINDS = ['car', 'motorcycle', 'van', 'bicycle', 'other'] as const;
export type VehicleKind = (typeof VEHICLE_KINDS)[number];

/** Veículo. Datas e campos opcionais são `null` quando não preenchidos. */
export type Vehicle = SyncMetadata & {
  id: Id;
  name: string;
  kind: VehicleKind;
  plate: string | null;
  odometerKm: number | null;
  inspectionDue: CalendarDate | null;
  insuranceDue: CalendarDate | null;
};

export type VehicleInput = Pick<
  Vehicle,
  'name' | 'kind' | 'plate' | 'odometerKm' | 'inspectionDue' | 'insuranceDue'
>;

export const DOCUMENT_CATEGORIES = [
  'identity',
  'vehicle',
  'home',
  'health',
  'tax',
  'insurance',
  'work',
  'other',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

/** Registo de um documento (só metadados e validade; não guarda o ficheiro). */
export type DocumentRecord = SyncMetadata & {
  id: Id;
  title: string;
  category: DocumentCategory;
  expiresOn: CalendarDate | null;
  notes: string | null;
};

export type DocumentInput = Pick<DocumentRecord, 'title' | 'category' | 'expiresOn' | 'notes'>;
