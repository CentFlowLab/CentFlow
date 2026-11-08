import type {
  Account,
  AccountFlows,
  AccountInput,
  CalendarDate,
  Category,
  CategoryInput,
  CategoryType,
  DefaultCategory,
  Budget,
  BudgetCandidate,
  BudgetInput,
  Entry,
  EntryInput,
  EntryType,
  Id,
  GoalContribution,
  GoalContributionInput,
  SavingsGoal,
  SavingsGoalInput,
  Subscription,
  SubscriptionInput,
} from '@/core/finance';

/**
 * Contratos de acesso a dados. A interface usa apenas estes tipos; a implementação
 * atual é SQLite local e poderá ser substituída ou complementada pelo Supabase.
 */

export type AccountWithBalance = Account & {
  balance: number;
  entryCount: number;
};

export interface AccountRepository {
  list(options?: { includeArchived?: boolean }): Promise<Account[]>;
  listWithBalances(options?: { includeArchived?: boolean }): Promise<AccountWithBalance[]>;
  get(id: Id): Promise<Account | null>;
  create(input: AccountInput): Promise<Account>;
  /** Não permite mudar a moeda de uma conta com movimentos. */
  update(id: Id, input: AccountInput): Promise<Account>;
  setArchived(id: Id, archived: boolean): Promise<void>;
  /** Falha com `AccountInUseError` se existirem movimentos. */
  delete(id: Id): Promise<void>;
  /** Elimina a conta e todos os movimentos onde participa, numa única transação. */
  deleteWithEntries(id: Id): Promise<number>;
  getFlows(): Promise<Map<Id, AccountFlows>>;
}

export type CategoryWithUsage = Category & { entryCount: number };

export interface CategoryRepository {
  list(type?: CategoryType): Promise<Category[]>;
  listWithUsage(type?: CategoryType): Promise<CategoryWithUsage[]>;
  get(id: Id): Promise<Category | null>;
  create(input: CategoryInput): Promise<Category>;
  /** Não permite mudar o tipo de uma categoria com movimentos. */
  update(id: Id, input: CategoryInput): Promise<Category>;
  /**
   * Elimina a categoria. Se tiver movimentos, `reassignTo` (mesmo tipo) é obrigatório
   * e os movimentos passam para essa categoria na mesma transação.
   */
  delete(id: Id, options?: { reassignTo?: Id }): Promise<void>;
  /** Cria as categorias predefinidas uma única vez (idempotente). */
  seedDefaults(categories: readonly (DefaultCategory & { name: string })[]): Promise<boolean>;
}

export type EntrySort = 'dateDesc' | 'dateAsc';

export type EntryFilter = {
  search?: string;
  type?: EntryType;
  /** Corresponde à conta de origem ou de destino. */
  accountId?: Id;
  categoryId?: Id;
  from?: CalendarDate;
  to?: CalendarDate;
  sort?: EntrySort;
  limit?: number;
  offset?: number;
};

export type EntryPage = { items: Entry[]; total: number };

/** Totais agregados (sem transferências) por mês, moeda, tipo e categoria. */
export type EntryAggregate = {
  month: string;
  currency: string;
  type: 'income' | 'expense';
  categoryId: Id;
  amount: number;
};

export interface EntryRepository {
  list(filter?: EntryFilter): Promise<EntryPage>;
  get(id: Id): Promise<Entry | null>;
  create(input: EntryInput): Promise<Entry>;
  update(id: Id, input: EntryInput): Promise<Entry>;
  delete(id: Id): Promise<void>;
  aggregate(range: { from: CalendarDate; to: CalendarDate }): Promise<EntryAggregate[]>;
  /**
   * Despesas reais no intervalo, com a moeda da conta.
   * Não altera saldos: rendimentos e transferências ficam de fora.
   */
  listExpenses(range: { from: CalendarDate; to: CalendarDate }): Promise<BudgetCandidate[]>;
}

export interface SubscriptionRepository {
  list(): Promise<Subscription[]>;
  get(id: Id): Promise<Subscription | null>;
  /** Não cria movimentos. A categoria, se existir, tem de ser de despesa. */
  create(input: SubscriptionInput): Promise<Subscription>;
  update(id: Id, input: SubscriptionInput): Promise<Subscription>;
  delete(id: Id): Promise<void>;
}

export interface SavingsGoalRepository {
  list(): Promise<SavingsGoal[]>;
  get(id: Id): Promise<SavingsGoal | null>;
  create(input: SavingsGoalInput): Promise<SavingsGoal>;
  update(id: Id, input: SavingsGoalInput): Promise<SavingsGoal>;
  /** Apaga também as contribuições ativas. Não cria movimentos. */
  delete(id: Id): Promise<void>;
  listContributions(goalId: Id): Promise<GoalContribution[]>;
  /** Não cria movimentos. A moeda é a do objetivo. */
  addContribution(input: GoalContributionInput): Promise<GoalContribution>;
  /** Corrigir um engano é apagar a linha, não alterar o valor. */
  deleteContribution(id: Id): Promise<void>;
}

export interface BudgetRepository {
  list(): Promise<Budget[]>;
  get(id: Id): Promise<Budget | null>;
  /** Falha se a categoria não for de despesa ou se já tiver um orçamento ativo. */
  create(input: BudgetInput): Promise<Budget>;
  update(id: Id, input: BudgetInput): Promise<Budget>;
  delete(id: Id): Promise<void>;
}

export type DataEntity =
  | 'accounts'
  | 'budgets'
  | 'categories'
  | 'entries'
  | 'goal_contributions'
  | 'goals'
  | 'subscriptions';

export interface Repositories {
  accounts: AccountRepository;
  categories: CategoryRepository;
  entries: EntryRepository;
  budgets: BudgetRepository;
  subscriptions: SubscriptionRepository;
  goals: SavingsGoalRepository;
  /** Notifica após cada escrita confirmada. Devolve a função para cancelar. */
  subscribe(listener: (entities: readonly DataEntity[]) => void): () => void;
}
