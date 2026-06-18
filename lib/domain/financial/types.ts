export type CentFlowScoreBand = 'critical' | 'fair' | 'good' | 'excellent';

export type CentFlowScoreBreakdown = {
  savings: number;
  debt: number;
  subscriptions: number;
  goals: number;
  stability: number;
};

export type CentFlowScoreResult = {
  score: number;
  band: CentFlowScoreBand;
  bandLabel: string;
  breakdown: CentFlowScoreBreakdown;
  summary: string;
};

export type FinancialLevelId = 'bronze' | 'silver' | 'gold' | 'platinum';

export type FinancialLevel = {
  id: FinancialLevelId;
  label: string;
  minScore: number;
  maxScore: number;
  perks: string[];
};

export type AssistantActionId =
  | 'add_expense'
  | 'scan_receipt'
  | 'add_subscription'
  | 'create_goal'
  | 'review_subscriptions'
  | 'view_warranties'
  | 'view_plan';

export type AssistantInsight = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionId?: AssistantActionId;
  actionLabel?: string;
};

export type DailyAssistantPlan = {
  greeting: string;
  insights: AssistantInsight[];
  savingsTip?: string;
};

export type CentFlowScoreInput = {
  netWorth: number;
  netWorthChangePercent: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySubscriptionCost: number;
  totalDebt: number;
  goals: Array<{ current: number; target: number }>;
  subscriptionsRenewingSoon: number;
  featuredGoalGap?: number | null;
  warrantiesExpiringSoon?: number;
  weeklyExpenseDelta?: number | null;
  goalsCount?: number;
  transactionCount?: number;
};
