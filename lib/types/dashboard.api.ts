/**
 * Tipos brutos da API do Dashboard.
 * Suportam snake_case e camelCase — normalizados em dashboard.mapper.ts
 */

export type RawAttentionType = 'warranty' | 'credit' | 'subscription' | string;
export type RawAttentionPriority = 'high' | 'medium' | 'low' | string;
export type RawSuggestionType = 'goal' | 'savings' | 'investment' | 'general' | string;

export interface RawAccount {
  id?: string | number;
  name?: string;
  balance?: number;
  currency?: string;
}

export interface RawInventoryItem {
  id?: string | number;
  name?: string;
  value?: number;
  category?: string;
}

export interface RawRecurringInvestment {
  id?: string | number;
  name?: string;
  is_active?: boolean;
  isActive?: boolean;
  applied_amount?: number;
  appliedAmount?: number;
  current_value?: number;
  currentValue?: number;
}

export interface RawCredit {
  id?: string | number;
  name?: string;
  outstanding_balance?: number;
  outstandingBalance?: number;
  next_payment_date?: string;
  nextPaymentDate?: string;
  next_payment_amount?: number;
  nextPaymentAmount?: number;
}

/** Património já calculado pelo backend */
export interface RawNetWorthComputed {
  net_worth?: number;
  netWorth?: number;
  total_assets?: number;
  totalAssets?: number;
  total_liabilities?: number;
  totalLiabilities?: number;
  breakdown?: {
    accounts?: number;
    inventory?: number;
    investments?: number;
    savings?: number;
    liabilities?: number;
  };
  assets_by_category?: Array<{ key?: string; label?: string; value?: number }>;
  assetsByCategory?: Array<{ key?: string; label?: string; value?: number }>;
}

/** Entidades brutas para cálculo local via net-worth.service */
export interface RawNetWorthEntities {
  accounts?: RawAccount[];
  inventory?: RawInventoryItem[];
  investments?: RawRecurringInvestment[];
  recurring_investments?: RawRecurringInvestment[];
  credits?: RawCredit[];
}

export type RawNetWorthResponse = RawNetWorthComputed &
  RawNetWorthEntities & {
    previous_month_net_worth?: number;
    previousMonthNetWorth?: number;
  };

export interface RawAttentionItem {
  id?: string | number;
  type?: RawAttentionType;
  title?: string;
  description?: string;
  due_date?: string;
  dueDate?: string;
  priority?: RawAttentionPriority;
  amount?: number;
}

export interface RawSuggestion {
  id?: string | number;
  title?: string;
  description?: string;
  action_label?: string;
  actionLabel?: string;
  type?: RawSuggestionType;
}

export interface RawDashboardMetrics {
  weekly_spending?: number;
  weeklySpending?: number;
  net_worth_change_this_month?: number;
  netWorthChangeThisMonth?: number;
  personal_inflation?: number | null;
  personalInflation?: number | null;
  previous_month_net_worth?: number;
  previousMonthNetWorth?: number;
  net_worth_change_percent?: number;
  netWorthChangePercent?: number;
}

/** Resposta agregada GET /dashboard */
export interface RawDashboardResponse {
  net_worth?: RawNetWorthResponse;
  netWorth?: RawNetWorthResponse;
  metrics?: RawDashboardMetrics;
  attention_items?: RawAttentionItem[];
  attentionItems?: RawAttentionItem[];
  suggestions?: RawSuggestion[];
  /** Métricas podem vir ao nível raiz */
  weekly_spending?: number;
  weeklySpending?: number;
  net_worth_change_this_month?: number;
  netWorthChangeThisMonth?: number;
  personal_inflation?: number | null;
  personalInflation?: number | null;
  previous_month_net_worth?: number;
  previousMonthNetWorth?: number;
  net_worth_change_percent?: number;
  netWorthChangePercent?: number;
  data?: RawDashboardResponse;
}

export interface RawTransactionsSummary {
  weekly_spending?: number;
  weeklySpending?: number;
  total_expenses?: number;
  totalExpenses?: number;
}
