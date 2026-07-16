import type { CategoryBudget, CategoryBudgetStatus } from '@/lib/domain/category-budget.types';
import type { BankAccount } from '@/lib/domain/account.types';
import type { Goal, Subscription } from '@/lib/domain/assets.types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { Credit, InventoryItem } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';
import type { CreditAnalysis } from '@/lib/credit/credit-analysis';
import type { DetectedSubscription } from '@/lib/subscriptions/detect-subscriptions';

import type { Recommendation } from './recommendations';
import type { FinancialState } from './financial-state.types';
import type { CentFlowScoreResult } from './types';

import type { CashflowProjectionResult } from './cashflow-projection';
import type { LoanPaymentRecord } from './loan-payments';
import type { MonthlyAvailableBreakdown } from './monthly-available';
import type { NetWorthResult } from '@/lib/domain/types';

/** Identifica o evento que disparou o recálculo. */
export type FinancialRecalcTrigger =
  | { type: 'transaction_created'; transactionId?: string }
  | { type: 'transaction_updated'; transactionId: string }
  | { type: 'transaction_deleted'; transactionId: string }
  | { type: 'goal_created'; goalId?: string }
  | { type: 'goal_updated'; goalId?: string }
  | { type: 'goal_contribution_created'; goalId?: string }
  | { type: 'goal_contribution_withdrawn'; goalId?: string }
  | { type: 'credit_created'; creditId?: string }
  | { type: 'credit_updated'; creditId?: string }
  | { type: 'credit_deleted'; creditId: string }
  | { type: 'loan_payment_created'; creditId?: string }
  | { type: 'subscription_created'; subscriptionId?: string }
  | { type: 'subscription_updated'; subscriptionId?: string }
  | { type: 'subscription_deleted'; subscriptionId: string }
  | { type: 'category_budget_updated'; category?: string }
  | { type: 'open_banking_import'; importedCount?: number }
  | { type: 'account_created'; accountId?: string }
  | { type: 'account_updated'; accountId?: string }
  | { type: 'account_deleted'; accountId: string }
  | { type: 'manual_refresh' };

export const FINANCIAL_ENGINE_STEP_ORDER = [
  'liabilities',
  'subscriptions',
  'creditState',
  'categoryBudgets',
  'budget',
  'netWorth',
  'cashflowProjection',
  'healthScore',
  'homeSummary',
  'recommendations',
] as const;

export type FinancialEngineStepId = (typeof FINANCIAL_ENGINE_STEP_ORDER)[number];

/** Snapshot de dados brutos recolhido do cache React Query. */
export type FinancialEngineInput = {
  transactions: Transaction[];
  accounts: BankAccount[];
  credits: Credit[];
  goals: Goal[];
  goalContributions: GoalContribution[];
  subscriptions: Subscription[];
  inventory: InventoryItem[];
  loanPayments: LoanPaymentRecord[];
  categoryBudgets: CategoryBudget[];
  dismissedSubscriptionIds: string[];
  prioritizeDebtAmortization: boolean;
  recommendationRules: import('./recommendations').RecommendationRuleSettings;
  categorySpendAlertThreshold: number;
  referenceDate?: Date;
};

export type FinancialEngineLiabilitiesResult = {
  totalDebt: number;
  monthlyPayments: number;
};

export type FinancialEngineSubscriptionsResult = {
  detected: DetectedSubscription[];
  monthlyTotal: number;
  renewingSoon: number;
};

export type FinancialEngineCreditStateResult = {
  analyses: Array<{ creditId: string; analysis: CreditAnalysis }>;
  totalDebt: number;
  monthlyPayments: number;
  cardCount: number;
  loanCount: number;
};

export type FinancialEngineNetWorthResult = NetWorthResult & {
  changePercent: number;
  monthlyChange: number;
};

export type FinancialEngineStepResults = {
  /** Snapshot canónico — fonte única de verdade para todos os passos derivados. */
  coreState?: FinancialState;
  liabilities?: FinancialEngineLiabilitiesResult;
  subscriptions?: FinancialEngineSubscriptionsResult;
  creditState?: FinancialEngineCreditStateResult;
  categoryBudgets?: CategoryBudgetStatus[];
  budget?: MonthlyAvailableBreakdown;
  netWorth?: FinancialEngineNetWorthResult;
  cashflowProjection?: CashflowProjectionResult;
  healthScore?: CentFlowScoreResult;
  homeSummary?: { message: string; weeklySpending: number };
  recommendations?: Recommendation[];
};

export type FinancialEngineStepOutcome = {
  step: FinancialEngineStepId;
  ok: boolean;
  durationMs: number;
  error?: string;
};

export type FinancialEngineRunResult = {
  trigger: FinancialRecalcTrigger;
  userId: string;
  totalDurationMs: number;
  steps: FinancialEngineStepOutcome[];
  results: FinancialEngineStepResults;
};

export type FinancialEngineStepRunner = (
  ctx: FinancialEngineContext,
) => void | Promise<void>;

export type FinancialEngineContext = {
  userId: string;
  input: FinancialEngineInput;
  asOf: Date;
  /** Estado canónico calculado uma vez antes dos passos derivados. */
  coreState: FinancialState;
  results: FinancialEngineStepResults;
};

export type FinancialEngineOptions = {
  stepRunners?: Partial<Record<FinancialEngineStepId, FinancialEngineStepRunner>>;
  onStepComplete?: (outcome: FinancialEngineStepOutcome) => void;
};
