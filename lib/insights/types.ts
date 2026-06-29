import type { Credit } from '@/lib/domain/types';
import type { Subscription } from '@/lib/domain/assets.types';
import type { Transaction } from '@/lib/domain/transaction.types';

export type InsightType = 'warning' | 'positive' | 'neutral' | 'tip';

export interface Insight {
  id: string;
  type: InsightType;
  icon: string;
  title: string;
  body: string;
  priority: number;
  action?: { label: string; route: string };
}

export interface InsightGoal {
  id: string;
  name: string;
  current: number;
  target: number;
}

export interface InsightInput {
  transactions: Transaction[];
  subscriptions: Subscription[];
  credits: Credit[];
  goals: InsightGoal[];
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyBudget?: number | null;
  netWorthChangePercent?: number;
  netWorthChangeAmount?: number;
  referenceDate?: Date;
}

export interface HealthScoreInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySubscriptionCost: number;
  monthlyBudget?: number | null;
  totalDebt: number;
  creditMonthlyPayments: number;
  /** Movimentos ocorridos no mês corrente */
  transactionCountThisMonth: number;
}

export type HealthScoreStatus = 'critical' | 'warning' | 'good' | 'excellent';

export interface HealthScoreComponentResult {
  score: number | null;
  max: number;
  label: string;
  detail: string;
  hasData: boolean;
}

export interface HealthScoreResult {
  total: number;
  components: {
    savings: HealthScoreComponentResult;
    cashflow: HealthScoreComponentResult;
    debt: HealthScoreComponentResult;
    budget: HealthScoreComponentResult;
    subscriptions: HealthScoreComponentResult;
  };
  status: HealthScoreStatus;
  hasSufficientData: boolean;
  /** Componentes com score numérico (exclui "sem dados"). */
  scoredComponentCount: number;
}
