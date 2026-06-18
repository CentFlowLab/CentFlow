import type {
  CentFlowScoreBand,
  CentFlowScoreInput,
  CentFlowScoreResult,
  FinancialLevel,
  FinancialLevelId,
} from './types';

const LEVELS: FinancialLevel[] = [
  {
    id: 'bronze',
    label: 'Organizador',
    minScore: 0,
    maxScore: 39,
    perks: ['Resumo semanal', 'Alertas básicos'],
  },
  {
    id: 'silver',
    label: 'Gestor',
    minScore: 40,
    maxScore: 59,
    perks: ['Insights avançados', 'Centro de acções'],
  },
  {
    id: 'gold',
    label: 'Estratega',
    minScore: 60,
    maxScore: 79,
    perks: ['Relatórios PDF', 'CentFlow Score detalhado'],
  },
  {
    id: 'platinum',
    label: 'Mestre',
    minScore: 80,
    maxScore: 100,
    perks: ['Assistente proactivo', 'Badges exclusivos'],
  },
];

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function bandFromScore(score: number): { band: CentFlowScoreBand; label: string } {
  if (score >= 80) return { band: 'excellent', label: 'Excelente' };
  if (score >= 60) return { band: 'good', label: 'Bom' };
  if (score >= 40) return { band: 'fair', label: 'Razoável' };
  return { band: 'critical', label: 'Atenção' };
}

function scoreSavings(monthlyIncome: number, monthlyExpenses: number): number {
  if (monthlyIncome <= 0) {
    return monthlyExpenses <= 0 ? 15 : 5;
  }
  const rate = (monthlyIncome - monthlyExpenses) / monthlyIncome;
  if (rate >= 0.25) return 25;
  if (rate >= 0.15) return 20;
  if (rate >= 0.05) return 12;
  if (rate >= 0) return 6;
  return 0;
}

function scoreDebt(totalDebt: number, monthlyIncome: number): number {
  if (totalDebt <= 0) return 25;
  if (monthlyIncome <= 0) return totalDebt < 5000 ? 12 : 4;
  const ratio = totalDebt / (monthlyIncome * 12);
  if (ratio <= 0.5) return 22;
  if (ratio <= 1) return 16;
  if (ratio <= 2) return 8;
  return 2;
}

function scoreSubscriptions(monthlyCost: number, monthlyIncome: number): number {
  if (monthlyCost <= 0) return 20;
  if (monthlyIncome <= 0) return monthlyCost < 30 ? 12 : 4;
  const ratio = monthlyCost / monthlyIncome;
  if (ratio <= 0.05) return 20;
  if (ratio <= 0.1) return 14;
  if (ratio <= 0.2) return 8;
  return 2;
}

function scoreGoals(goals: Array<{ current: number; target: number }>): number {
  if (goals.length === 0) return 6;
  const progress =
    goals.reduce((sum, goal) => {
      if (goal.target <= 0) return sum;
      return sum + clamp((goal.current / goal.target) * 100, 0, 100);
    }, 0) / goals.length;
  if (progress >= 75) return 20;
  if (progress >= 50) return 15;
  if (progress >= 25) return 10;
  return 5;
}

function scoreStability(netWorth: number, changePercent: number): number {
  let points = netWorth >= 0 ? 6 : 2;
  if (changePercent >= 5) points += 4;
  else if (changePercent >= 0) points += 3;
  else if (changePercent >= -5) points += 1;
  return clamp(points, 0, 10);
}

export function calculateCentFlowScore(input: CentFlowScoreInput): CentFlowScoreResult {
  const breakdown = {
    savings: scoreSavings(input.monthlyIncome, input.monthlyExpenses),
    debt: scoreDebt(input.totalDebt, input.monthlyIncome),
    subscriptions: scoreSubscriptions(input.monthlySubscriptionCost, input.monthlyIncome),
    goals: scoreGoals(input.goals),
    stability: scoreStability(input.netWorth, input.netWorthChangePercent),
  };

  const score = clamp(
    breakdown.savings +
      breakdown.debt +
      breakdown.subscriptions +
      breakdown.goals +
      breakdown.stability,
  );

  const { band, label } = bandFromScore(score);

  let summary = 'Continua a registar movimentos para afinar o teu score.';
  if (score >= 80) summary = 'Saúde financeira sólida — mantém o ritmo.';
  else if (score >= 60) summary = 'Boa base — pequenos ajustes podem libertar margem.';
  else if (score >= 40) summary = 'Há margem para optimizar despesas e dívidas.';
  else summary = 'Prioriza controlar subscrições e reforçar poupança.';

  return { score, band, bandLabel: label, breakdown, summary };
}

export function getFinancialLevel(score: number): FinancialLevel {
  const match =
    LEVELS.find((level) => score >= level.minScore && score <= level.maxScore) ?? LEVELS[0];
  return match;
}

export function getFinancialLevelProgress(score: number): {
  level: FinancialLevel;
  nextLevel: FinancialLevel | null;
  progressPercent: number;
} {
  const level = getFinancialLevel(score);
  const index = LEVELS.findIndex((item) => item.id === level.id);
  const nextLevel = index < LEVELS.length - 1 ? LEVELS[index + 1] : null;

  if (!nextLevel) {
    return { level, nextLevel: null, progressPercent: 100 };
  }

  const span = nextLevel.minScore - level.minScore;
  const progress = span > 0 ? ((score - level.minScore) / span) * 100 : 100;

  return { level, nextLevel, progressPercent: clamp(progress) };
}

export function monthlySubscriptionTotal(
  subscriptions: Array<{ amount: number; billingInterval?: string }>,
): number {
  return subscriptions.reduce((sum, sub) => {
    const interval = sub.billingInterval ?? 'monthly';
    if (interval === 'annual') return sum + sub.amount / 12;
    if (interval === 'quarterly') return sum + sub.amount / 3;
    return sum + sub.amount;
  }, 0);
}

export function estimateMonthlyCashflow(transactions: Array<{ type: string; amount: number; date: string }>): {
  income: number;
  expenses: number;
} {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  let income = 0;
  let expenses = 0;

  for (const tx of transactions) {
    const date = new Date(tx.date);
    if (date.getMonth() !== month || date.getFullYear() !== year) continue;
    if (tx.type === 'income') income += tx.amount;
    else expenses += tx.amount;
  }

  return { income, expenses };
}

export { LEVELS as FINANCIAL_LEVELS };
export type { FinancialLevelId };
