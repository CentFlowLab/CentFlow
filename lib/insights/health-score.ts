import type { HealthScoreInput, HealthScoreResult, HealthScoreStatus } from './types';

function clamp(value: number, min = 0, max = 20): number {
  return Math.min(max, Math.max(min, value));
}

function statusFromTotal(total: number): HealthScoreStatus {
  if (total >= 86) return 'excellent';
  if (total >= 66) return 'good';
  if (total >= 41) return 'warning';
  return 'critical';
}

function scoreSavings(income: number, expenses: number): { score: number; detail: string; hasData: boolean } {
  if (income <= 0) {
    return { score: 10, detail: 'Sem rendimento registado — não penalizado.', hasData: false };
  }
  const rate = (income - expenses) / income;
  if (rate > 0.2) return { score: 20, detail: 'Poupas mais de 20% do rendimento.', hasData: true };
  if (rate >= 0.05) return { score: 10, detail: 'Poupança entre 5% e 20%.', hasData: true };
  return { score: 0, detail: 'Poupança abaixo de 5%.', hasData: true };
}

function scoreCashflow(income: number, expenses: number): { score: number; detail: string; hasData: boolean } {
  if (income <= 0 && expenses <= 0) {
    return { score: 10, detail: 'Sem dados de fluxo de caixa.', hasData: false };
  }
  if (income > expenses) return { score: 20, detail: 'Receitas superiores às despesas.', hasData: true };
  if (Math.abs(income - expenses) < 1) return { score: 10, detail: 'Receitas e despesas equilibradas.', hasData: true };
  return { score: 0, detail: 'Despesas superiores às receitas.', hasData: true };
}

function scoreDebt(
  totalDebt: number,
  income: number,
  creditPayments: number,
): { score: number; detail: string; hasData: boolean } {
  if (totalDebt <= 0) return { score: 20, detail: 'Sem créditos activos.', hasData: true };
  if (income <= 0) {
    return { score: 10, detail: 'Dívida registada — rendimento não disponível.', hasData: false };
  }
  const effort = (creditPayments / income) * 100;
  if (effort < 30) return { score: 10, detail: `Taxa de esforço ${effort.toFixed(0)}% — controlada.`, hasData: true };
  return { score: 0, detail: `Taxa de esforço ${effort.toFixed(0)}% — elevada.`, hasData: true };
}

function scoreBudget(
  budget: number | null | undefined,
  expenses: number,
): { score: number; detail: string; hasData: boolean } {
  if (budget == null || budget <= 0) {
    return { score: 10, detail: 'Orçamento não definido — neutro.', hasData: false };
  }
  const ratio = expenses / budget;
  if (ratio <= 1) return { score: 20, detail: 'Dentro do orçamento mensal.', hasData: true };
  if (ratio <= 1.1) return { score: 10, detail: 'Até 10% acima do orçamento.', hasData: true };
  return { score: 0, detail: 'Mais de 10% acima do orçamento.', hasData: true };
}

function scoreSubscriptions(
  subCost: number,
  income: number,
): { score: number; detail: string; hasData: boolean } {
  if (subCost <= 0) return { score: 20, detail: 'Sem subscrições registadas.', hasData: true };
  if (income <= 0) {
    return { score: 10, detail: 'Subscrições activas — rendimento não disponível.', hasData: false };
  }
  const ratio = subCost / income;
  if (ratio < 0.05) return { score: 20, detail: 'Subscrições abaixo de 5% do rendimento.', hasData: true };
  if (ratio <= 0.1) return { score: 10, detail: 'Subscrições entre 5% e 10%.', hasData: true };
  return { score: 0, detail: 'Subscrições acima de 10% do rendimento.', hasData: true };
}

export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  const monthlyIncome = Number.isFinite(input.monthlyIncome) ? input.monthlyIncome : 0;
  const monthlyExpenses = Number.isFinite(input.monthlyExpenses) ? input.monthlyExpenses : 0;
  const monthlySubscriptionCost = Number.isFinite(input.monthlySubscriptionCost)
    ? input.monthlySubscriptionCost
    : 0;
  const totalDebt = Number.isFinite(input.totalDebt) ? input.totalDebt : 0;
  const creditMonthlyPayments = Number.isFinite(input.creditMonthlyPayments)
    ? input.creditMonthlyPayments
    : 0;

  const savingsR = scoreSavings(monthlyIncome, monthlyExpenses);
  const cashflowR = scoreCashflow(monthlyIncome, monthlyExpenses);
  const debtR = scoreDebt(totalDebt, monthlyIncome, creditMonthlyPayments);
  const budgetR = scoreBudget(input.monthlyBudget, monthlyExpenses);
  const subsR = scoreSubscriptions(monthlySubscriptionCost, monthlyIncome);

  const components = {
    savings: { score: savingsR.score, max: 20, label: 'Poupança', detail: savingsR.detail, hasData: savingsR.hasData },
    cashflow: { score: cashflowR.score, max: 20, label: 'Fluxo de caixa', detail: cashflowR.detail, hasData: cashflowR.hasData },
    debt: { score: debtR.score, max: 20, label: 'Dívida', detail: debtR.detail, hasData: debtR.hasData },
    budget: { score: budgetR.score, max: 20, label: 'Orçamento', detail: budgetR.detail, hasData: budgetR.hasData },
    subscriptions: {
      score: subsR.score,
      max: 20,
      label: 'Subscrições',
      detail: subsR.detail,
      hasData: subsR.hasData,
    },
  };

  const total = clamp(
    components.savings.score +
      components.cashflow.score +
      components.debt.score +
      components.budget.score +
      components.subscriptions.score,
    0,
    100,
  );

  return {
    total,
    components,
    status: statusFromTotal(total),
  };
}
