import type { Subscription } from '@/lib/domain/assets.types';
import type { Credit } from '@/lib/domain/types';

import type {
  EnrichedAccountState,
  FinancialState,
  GoalProgressState,
} from './financial-state.types';

export type SimulationScenarioType =
  | 'amortize_credit'
  | 'pay_credit_card'
  | 'contribute_goal'
  | 'withdraw_goal'
  | 'transfer_to_investment'
  | 'withdraw_investment'
  | 'cancel_subscription'
  | 'increase_monthly_savings'
  | 'reduce_category_spending'
  | 'increase_monthly_income';

export type SimulationScenario =
  | { type: 'amortize_credit'; creditId: string; accountId: string; amount: number }
  | { type: 'pay_credit_card'; creditId: string; accountId: string; amount: number }
  | { type: 'contribute_goal'; goalId: string; accountId: string; amount: number }
  | { type: 'withdraw_goal'; goalId: string; accountId: string; amount: number }
  | { type: 'transfer_to_investment'; fromAccountId: string; toAccountId: string; amount: number }
  | { type: 'withdraw_investment'; fromAccountId: string; toAccountId: string; amount: number }
  | { type: 'cancel_subscription'; subscriptionId: string }
  | { type: 'increase_monthly_savings'; amount: number }
  | {
      type: 'reduce_category_spending';
      categoryKey: string;
      categoryLabel?: string;
      reductionPercent?: number;
      reductionAmount?: number;
    }
  | { type: 'increase_monthly_income'; amount: number };

export type SimulationAccountSnapshot = {
  id: string;
  name: string;
  balance: number;
  budgetEnabled: boolean;
};

export type SimulationCreditSnapshot = {
  id: string;
  name: string;
  balance: number;
};

export type SimulationGoalSnapshot = {
  id: string;
  name: string;
  current: number;
  target: number;
};

export type SimulationSnapshot = {
  accounts: SimulationAccountSnapshot[];
  credits: SimulationCreditSnapshot[];
  creditCards: SimulationCreditSnapshot[];
  goals: SimulationGoalSnapshot[];
  availableThisMonth: number;
  dailySafeSpend: number;
  netWorth: number;
  totalDebt: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  recurringRatio: number;
  subscriptionMonthlyTotal: number;
  healthScore: number;
};

export type SimulationImpactLine = {
  label: string;
  before: string;
  after: string;
  delta?: string;
  tone?: 'positive' | 'negative' | 'neutral';
};

export type SimulationExplanation = {
  changes: string[];
  unchanged: string[];
  risks: string[];
  benefits: string[];
  summary: string;
};

export type SimulationWarning = {
  code: string;
  message: string;
};

export type SimulationResult = {
  scenarioType: SimulationScenarioType;
  title: string;
  before: SimulationSnapshot;
  after: SimulationSnapshot;
  impact: SimulationImpactLine[];
  explanation: SimulationExplanation;
  warnings: SimulationWarning[];
  recommendation: string;
  /** Marca explícita — simulações nunca persistem dados. */
  isReadOnly: true;
};

export type SimulateFinancialDecisionInput = {
  financialState: FinancialState;
  scenario: SimulationScenario;
  /** Gasto mensal por categoria (chave → valor) — para reduzir categoria. */
  categorySpending?: Record<string, number>;
};

export type SimWorkingState = {
  accounts: Map<string, EnrichedAccountState>;
  credits: Map<string, Credit>;
  goals: Map<string, GoalProgressState>;
  subscriptions: Subscription[];
  availableThisMonth: number;
  dailySafeSpend: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  daysRemaining: number;
  inventoryTotal: number;
  investmentTotal: number;
};

export const SIMULATION_DISCLAIMER =
  'Simulação — não altera os teus dados reais. Confirma antes de executar qualquer decisão.';
