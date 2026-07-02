import type { BankAccount } from '@/lib/domain/account.types';
import type { Goal, Subscription } from '@/lib/domain/assets.types';
import type { InventoryItem } from '@/lib/domain/types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { AttentionItem, Credit, NetWorthProjection, NetWorthResult, Suggestion } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';

import type { CentFlowScoreInput, CentFlowScoreResult } from './types';
import type { FinancialSuggestion } from './suggestions';
import type { LoanPaymentRecord } from './loan-payments';
import type { MonthlyAvailableBreakdown } from './monthly-available';
import type { ScoreExplanationLine } from './score-explain';
import type { FinancialCalendarDay } from './calendar';
import type { FinancialMetrics } from './metrics';
import type { BudgetExplanation, NetWorthExplanation } from './explain';
import type { FinancialEventSummary } from './events';

/** Input único para o Financial Core — apenas dados brutos, sem I/O. */
export type CalculateFinancialStateInput = {
  transactions: Transaction[];
  accounts?: BankAccount[];
  credits?: Credit[];
  goals?: Goal[];
  goalContributions?: GoalContribution[];
  subscriptions?: Subscription[];
  inventory?: InventoryItem[];
  loanPayments?: LoanPaymentRecord[];
  investments?: Array<{ id: string; name: string; currentValue: number; isActive?: boolean }>;
  /** Data de referência (default: hoje). */
  today?: Date;
};

export type EnrichedAccountState = BankAccount & {
  balance: number;
  budgetEnabledResolved: boolean;
};

export type CreditCardState = {
  credit: Credit;
  debt: number;
  limit?: number;
  available?: number;
  utilizationPercent?: number;
};

export type GoalProgressState = {
  id: string;
  name: string;
  current: number;
  target: number;
  percent: number;
  remaining: number;
  isComplete: boolean;
};

export type CashFlowState = {
  monthlyIncome: number;
  monthlyExpenses: number;
  net: number;
  savingsRate: number;
  weeklySpending: number;
};

export type SubscriptionState = {
  items: Subscription[];
  monthlyTotal: number;
  renewingSoon: number;
};

export type InvestmentSummary = {
  totalBalance: number;
  accountCount: number;
  expectedReturnWeighted?: number;
};

export type CreditSummary = {
  totalDebt: number;
  monthlyPayments: number;
  weightedTaeg?: number;
  cardCount: number;
  loanCount: number;
};

export type FinancialInsight = {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'positive';
  dataUsed?: string[];
};

export type FinancialWarning = {
  code: string;
  message: string;
};

export type HealthScoreState = CentFlowScoreResult & {
  input: CentFlowScoreInput;
  explanation: {
    earned: ScoreExplanationLine[];
    missing: ScoreExplanationLine[];
  };
};

/** Estado financeiro consolidado — única fonte de verdade para ecrãs. */
export type FinancialState = {
  asOf: Date;
  accounts: EnrichedAccountState[];
  creditCards: CreditCardState[];
  credits: Credit[];
  budget: MonthlyAvailableBreakdown;
  availableThisMonth: number;
  dailySafeSpend: number;
  budgetExplanation: BudgetExplanation;
  cashFlow: CashFlowState;
  netWorth: NetWorthResult;
  netWorthExplanation: NetWorthExplanation;
  projection: NetWorthProjection;
  previousMonthNetWorth: number;
  netWorthChangePercent: number;
  netWorthChangeThisMonth: number;
  goalProgress: GoalProgressState[];
  subscriptions: SubscriptionState;
  investmentSummary: InvestmentSummary;
  creditSummary: CreditSummary;
  calendar: FinancialCalendarDay[];
  metrics: FinancialMetrics;
  insights: FinancialInsight[];
  warnings: FinancialWarning[];
  suggestions: Suggestion[];
  financialSuggestions: FinancialSuggestion[];
  attentionItems: AttentionItem[];
  healthScore: HealthScoreState;
  events: FinancialEventSummary;
  /** Compatível com DashboardData legado. */
  dashboard: {
    personalInflation: number | null;
  };
};
