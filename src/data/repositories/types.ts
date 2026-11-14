import type { BackupFile, RestorePlan } from '@/core/backup';
import type {
  Account,
  VehicleExternalCost,
  VehicleExternalCostInput,
  AccountSetting,
  WealthIntegration,
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
  HistoryEntry,
  GoalContributionInput,
  SavingsGoal,
  SavingsGoalInput,
  WealthItem,
  Vehicle,
  VehicleInput,
  DocumentRecord,
  DocumentInput,
  WealthItemInput,
  WealthPaymentInput,
  LoanLedgerEntry,
  VehicleCostType,
  Subscription,
  SubscriptionInput,
  AccountMonthFlow,
  AccountSnapshotInput,
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
  /**
   * Dados para o saldo de cada conta no fim de cada mês (histórico do património): contas não
   * eliminadas (incluindo arquivadas) e a variação líquida de cada uma por mês.
   */
  balanceHistory(): Promise<{ accounts: AccountSnapshotInput[]; flows: AccountMonthFlow[] }>;
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
  /**
   * Grava a ordem manual das categorias de um tipo. `ids` são todas as ativas desse tipo, pela
   * ordem nova. Só a posição muda; nenhum movimento é tocado.
   */
  reorder(type: CategoryType, ids: readonly Id[]): Promise<void>;
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
  vehicleId?: Id;
  /** Só despesas e rendimentos sem veículo (para associar movimentos existentes). */
  withoutVehicle?: boolean;
  /** Só os importados por classificar (ADR-082). */
  needsReview?: boolean;
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

/** Os mesmos totais, por dia, para um relatório que não cabe num mês fechado. */
export type DailyAggregate = {
  date: CalendarDate;
  currency: string;
  type: 'income' | 'expense';
  categoryId: Id | null;
  amount: number;
};

export interface EntryRepository {
  list(filter?: EntryFilter): Promise<EntryPage>;
  get(id: Id): Promise<Entry | null>;
  create(input: EntryInput): Promise<Entry>;
  /**
   * Cria vários movimentos numa só transação (ex.: extrato importado). Se um falhar a validação,
   * nenhum é gravado e o erro indica a posição (`index`).
   */
  createMany(inputs: readonly EntryInput[]): Promise<Entry[]>;
  /** Sem campos de veículo no `input`, mantém a ligação ao veículo que existia. */
  update(id: Id, input: EntryInput): Promise<Entry>;
  /** Quantos movimentos estão por classificar (ADR-082). */
  countNeedsReview(): Promise<number>;
  /** Marca como revistos (não muda categoria, valor nem data). */
  markReviewed(ids: readonly Id[]): Promise<void>;
  /** Aplica uma categoria do mesmo tipo e marca como revisto. */
  classify(id: Id, categoryId: Id): Promise<Entry>;
  /**
   * Converte uma despesa e uma receita por classificar (contas próprias diferentes, mesma moeda,
   * valor e dia) numa transferência, numa só transação: a despesa passa a transferência e a receita
   * é apagada. Nunca automático; recusa se alguma condição falhar.
   */
  convertToTransfer(expenseId: Id, incomeId: Id): Promise<Entry>;
  delete(id: Id): Promise<void>;
  /**
   * Liga movimentos existentes a um veículo, numa só transação, sem mudar valor, categoria, conta
   * nem data (ADR-054).
   */
  linkVehicle(
    ids: readonly Id[],
    link: { vehicleId: Id; vehicleCostType: VehicleCostType },
  ): Promise<void>;
  /** Todos os movimentos do veículo (mais recentes primeiro), com a moeda da conta. */
  listForVehicle(vehicleId: Id): Promise<(Entry & { currency: string })[]>;
  aggregate(range: { from: CalendarDate; to: CalendarDate }): Promise<EntryAggregate[]>;
  /** Igual a `aggregate`, agrupado pelo dia em vez do mês. */
  aggregateByDate(range: { from: CalendarDate; to: CalendarDate }): Promise<DailyAggregate[]>;
  /**
   * Despesas reais no intervalo, com a moeda da conta.
   * Não altera saldos: rendimentos e transferências ficam de fora.
   */
  listExpenses(range: { from: CalendarDate; to: CalendarDate }): Promise<BudgetCandidate[]>;
  /** Movimentos desde `since` (mais recentes primeiro), para sugestões a partir do histórico. */
  history(options: { since: CalendarDate; limit?: number }): Promise<(HistoryEntry & { id: Id })[]>;
  /** Outro movimento com o mesmo tipo, valor, conta e dia (provável repetição), ou `null`. */
  findSimilar(
    candidate: Pick<HistoryEntry, 'type' | 'amount' | 'accountId' | 'date'>,
  ): Promise<Id | null>;
}

/** Cópias de segurança: exportar, e restaurar sem nunca sobrescrever dados mais recentes. */
export interface BackupRepository {
  exportData(appVersion: string): Promise<BackupFile>;
  /** Movimentos ativos em CSV (data, tipo, valor, moeda, descrição, categoria, contas, notas). */
  entriesCsv(): Promise<string>;
  /** Pré-visualização: o que entraria, o que seria atualizado e o que fica por ser mais recente. */
  planRestore(backup: Pick<BackupFile, 'tables'>): Promise<RestorePlan>;
  /** Aplica numa transação; as alterações seguem para a sincronização como escritas normais. */
  applyRestore(backup: Pick<BackupFile, 'tables'>): Promise<RestorePlan>;
}

export interface SubscriptionRepository {
  list(): Promise<Subscription[]>;
  get(id: Id): Promise<Subscription | null>;
  /** Não cria movimentos. A categoria, se existir, tem de ser de despesa. */
  create(input: SubscriptionInput): Promise<Subscription>;
  update(id: Id, input: SubscriptionInput): Promise<Subscription>;
  delete(id: Id): Promise<void>;
}

export type GoalProgress = {
  id: Id;
  name: string;
  currency: string;
  targetAmount: number;
  targetOn: CalendarDate | null;
  /** Soma de todas as contribuições ativas. Não é uma coluna do objetivo. */
  savedAmount: number;
  /** Soma das contribuições ativas cuja data cai no período. */
  contributedInPeriod: number;
};

/** Transferência que se pode ligar a uma contribuição (ainda sem ligação). */
export type LinkableTransfer = {
  id: Id;
  date: CalendarDate;
  amount: number;
  description: string;
  accountId: Id;
  destinationAccountId: Id | null;
};

export interface SavingsGoalRepository {
  list(): Promise<SavingsGoal[]>;
  /** Progresso calculado na consulta. O objetivo continua sem total guardado. */
  progress(range: { from: CalendarDate; to: CalendarDate }): Promise<GoalProgress[]>;
  get(id: Id): Promise<SavingsGoal | null>;
  create(input: SavingsGoalInput): Promise<SavingsGoal>;
  update(id: Id, input: SavingsGoalInput): Promise<SavingsGoal>;
  /** Apaga também as contribuições ativas. Não cria movimentos. */
  delete(id: Id): Promise<void>;
  listContributions(goalId: Id): Promise<GoalContribution[]>;
  /** Não cria movimentos. A moeda é a do objetivo. */
  addContribution(input: GoalContributionInput): Promise<GoalContribution>;
  /** Corrige valor, data ou ligação. O objetivo da contribuição não muda. */
  updateContribution(
    id: Id,
    input: Omit<GoalContributionInput, 'goalId'>,
  ): Promise<GoalContribution>;
  deleteContribution(id: Id): Promise<void>;
  /** Transferências na moeda do objetivo ainda não ligadas (no máximo 20). */
  linkableTransfers(goalId: Id): Promise<LinkableTransfer[]>;
}

export interface WealthRepository {
  list(): Promise<WealthItem[]>;
  get(id: Id): Promise<WealthItem | null>;
  /** Não cria movimentos nem altera saldos de contas. */
  create(input: WealthItemInput): Promise<WealthItem>;
  update(id: Id, input: WealthItemInput): Promise<WealthItem>;
  /** Vendido ou pago nesse dia: sai do património atual e fica no histórico até lá. */
  close(id: Id, closedOn: CalendarDate): Promise<WealthItem>;
  /** Volta a contar no património atual. */
  reopen(id: Id): Promise<WealthItem>;
  /** Engano: sai de todo o lado, incluindo do histórico. */
  delete(id: Id): Promise<void>;
  /**
   * Pagamento de uma dívida, numa só transação: cria a despesa na conta e baixa o valor em dívida
   * (com histórico). A zero, a dívida fica paga nesse dia.
   */
  recordPayment(id: Id, payment: WealthPaymentInput): Promise<{ entry: Entry; item: WealthItem }>;
  /** Movimentos ativos ligados a um empréstimo (prestações e desembolsos), para o histórico. */
  loanLedger(id: Id): Promise<LoanLedgerEntry[]>;
  /**
   * Cartão de crédito do património passa a conta (tipo cartão) com o saldo em dívida negativo, para
   * receber despesas; no património fica pago nesse dia (não conta duas vezes).
   */
  moveCardToAccounts(id: Id, today: CalendarDate): Promise<Account>;
  /**
   * Associa (ou desassocia, com `null`) o item a uma integração (ADR-079). Não muda o valor nem
   * mais nada; a integração só atualiza itens que lhe pertencem.
   */
  setIntegration(id: Id, integration: WealthIntegration | null): Promise<WealthItem>;
}

/** Definições da conta sincronizadas entre aparelhos (ADR-079). */
export interface SettingsRepository {
  get(key: AccountSetting): Promise<string | null>;
  /** Grava (ou repõe) o valor; igual ao guardado não gera nada para enviar. */
  set(key: AccountSetting, value: string): Promise<void>;
}

export interface VehicleRepository {
  list(): Promise<Vehicle[]>;
  get(id: Id): Promise<Vehicle | null>;
  create(input: VehicleInput): Promise<Vehicle>;
  /** Campos novos ausentes no `input` mantêm o valor guardado. */
  update(id: Id, input: VehicleInput): Promise<Vehicle>;
  /** Movimentos, documentos e custos pagos por terceiros (para a confirmação antes de eliminar). */
  countLinks(id: Id): Promise<{ entries: number; documents: number; externalCosts: number }>;
  /**
   * Elimina o veículo e desliga os movimentos e documentos, numa só transação, sem alterar valores,
   * categorias, contas nem datas (ADR-054).
   */
  delete(id: Id): Promise<void>;
}

/**
 * Custos da viatura pagos por terceiros (ADR-081): uma tabela própria, nunca junta aos movimentos.
 * Apagar a viatura não os apaga.
 */
export interface VehicleExternalCostRepository {
  listForVehicle(vehicleId: Id): Promise<VehicleExternalCost[]>;
  get(id: Id): Promise<VehicleExternalCost | null>;
  create(input: VehicleExternalCostInput): Promise<VehicleExternalCost>;
  update(id: Id, input: VehicleExternalCostInput): Promise<VehicleExternalCost>;
  delete(id: Id): Promise<void>;
}

export interface DocumentRepository {
  list(): Promise<DocumentRecord[]>;
  get(id: Id): Promise<DocumentRecord | null>;
  create(input: DocumentInput): Promise<DocumentRecord>;
  update(id: Id, input: DocumentInput): Promise<DocumentRecord>;
  delete(id: Id): Promise<void>;
}

/** Ficheiro de um anexo por enviar para o Storage (fila só deste aparelho, ADR-056). */
export type AttachmentUpload = {
  attachmentId: Id;
  documentId: Id;
  /** Cópia do ficheiro na pasta da app. */
  localUri: string;
  mime: string;
  createdAt: string;
  attempts: number;
};

export interface AttachmentUploadRepository {
  enqueue(
    upload: Pick<AttachmentUpload, 'attachmentId' | 'documentId' | 'localUri' | 'mime'>,
  ): Promise<void>;
  pending(): Promise<AttachmentUpload[]>;
  markSent(attachmentId: Id): Promise<void>;
  markFailed(attachmentId: Id): Promise<void>;
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
  | 'subscriptions'
  | 'wealth_items'
  | 'vehicles'
  | 'documents'
  | 'user_settings'
  | 'vehicle_external_costs';

export interface Repositories {
  accounts: AccountRepository;
  categories: CategoryRepository;
  entries: EntryRepository;
  budgets: BudgetRepository;
  subscriptions: SubscriptionRepository;
  settings: SettingsRepository;
  vehicleExternalCosts: VehicleExternalCostRepository;
  backup: BackupRepository;
  goals: SavingsGoalRepository;
  wealth: WealthRepository;
  vehicles: VehicleRepository;
  documents: DocumentRepository;
  attachmentUploads: AttachmentUploadRepository;
  /** Notifica após cada escrita confirmada. Devolve a função para cancelar. */
  subscribe(listener: (entities: readonly DataEntity[]) => void): () => void;
}
