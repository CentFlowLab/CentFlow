/** Conta bancária com saldo líquido atual (já descontadas transferências para investimentos). */
export interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

/** Item do inventário de bens. */
export interface InventoryItem {
  id: string;
  name: string;
  value: number;
  category?: string;
  description?: string;
  sourceWarrantyId?: string;
  warrantyExpiredAt?: string;
  receiptUrl?: string;
}

/**
 * Investimento recorrente.
 * `currentValue` é o valor de mercado atual — não confundir com saldos de conta.
 * Apenas investimentos com regra ativa OU montante já aplicado entram no património.
 */
export interface RecurringInvestment {
  id: string;
  name: string;
  isActive: boolean;
  /** Total já investido (custo base). */
  appliedAmount: number;
  /** Valor de mercado atual — usado no cálculo de património. */
  currentValue: number;
}

export type CreditType = 'personal' | 'mortgage' | 'auto' | 'student' | 'card' | 'other';

/** Crédito / passivo com saldo em dívida. */
export interface Credit {
  id: string;
  name: string;
  outstandingBalance: number;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
  /** Montante original contratado. */
  originalAmount?: number;
  /** TAEG anual (%). */
  interestRateAnnual?: number;
  /** Spread sobre indexante (%). */
  spread?: number;
  /** Indexante (ex.: Euribor 12M %). */
  indexRate?: number;
  /** Prazo total em meses. */
  termMonths?: number;
  /** Prestação mensal (capital + juros). */
  monthlyPayment?: number;
  /** Seguro mensal associado. */
  insuranceMonthly?: number;
  creditType?: CreditType;
  lender?: string;
  startDate?: string;
  /** Rendimento mensal líquido para taxa de esforço. */
  monthlyIncome?: number;
  /**
   * Taxa de comissão de amortização antecipada (fracção: 0.005 = 0,5%).
   * Default legal PT: 0,5% (taxa fixa) / 0,25% (taxa variável). Editável por crédito.
   */
  earlyRepaymentCommissionRate?: number;
  notes?: string;
}

export type AssetCategoryKey = 'accounts' | 'inventory' | 'investments' | 'savings';

export interface AssetCategoryBreakdown {
  key: AssetCategoryKey;
  label: string;
  value: number;
}

export interface NetWorthResult {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  breakdown: {
    accounts: number;
    inventory: number;
    investments: number;
    savings: number;
    liabilities: number;
  };
  /** Breakdown por categoria de ativo — preparado para gráfico donut futuro. */
  assetsByCategory: AssetCategoryBreakdown[];
}

/** Património após incluir movimentos futuros agendados. */
export interface NetWorthProjection {
  /** Património actual + impacto líquido de movimentos com date > hoje. */
  netWorth: number;
  /** Delta líquido (receitas − despesas) dos movimentos futuros. */
  futureMovementsDelta: number;
}

export type AttentionType = 'warranty' | 'credit' | 'subscription' | 'goal';
export type AttentionPriority = 'high' | 'medium' | 'low';

export interface AttentionItem {
  id: string;
  type: AttentionType;
  title: string;
  description: string;
  dueDate?: string;
  priority: AttentionPriority;
  amount?: number;
}

export type SuggestionAction =
  | 'scan_receipt'
  | 'add_movement'
  | 'open_analises'
  | 'open_movimentos'
  | 'open_ativos_goals'
  | 'open_ativos_inventory'
  | 'open_recorrentes';

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  actionLabel?: string;
  type: 'goal' | 'savings' | 'investment' | 'general';
  action?: SuggestionAction;
}

/** Input bruto para cálculo de património — reutilizável em Análises e Ativos. */
export interface NetWorthInput {
  accounts: Account[];
  inventory: InventoryItem[];
  investments: RecurringInvestment[];
  credits: Credit[];
  /** Poupanças em objetivos — soma de `current` por meta. */
  savings?: number;
}

export interface DashboardData {
  netWorth: NetWorthResult;
  /** Projeção com movimentos futuros — preparado para ecrãs dedicados. */
  projection: NetWorthProjection;
  previousMonthNetWorth: number;
  netWorthChangePercent: number;
  weeklySpending: number;
  netWorthChangeThisMonth: number;
  personalInflation: number | null;
  attentionItems: AttentionItem[];
  suggestions: Suggestion[];
}
