import type { HealthScoreInput, HealthScoreResult, HealthScoreStatus } from './types';

type ComponentScore = {
  score: number | null;
  detail: string;
  hasData: boolean;
};

function statusFromTotal(total: number): HealthScoreStatus {
  if (total >= 86) return 'excellent';
  if (total >= 66) return 'good';
  if (total >= 41) return 'warning';
  return 'critical';
}

function scoreSavings(income: number, expenses: number): ComponentScore {
  if (income <= 0 && expenses <= 0) {
    return { score: null, detail: 'Sem dados de rendimento.', hasData: false };
  }
  if (income <= 0) {
    return { score: null, detail: 'Sem rendimento registado.', hasData: false };
  }
  const rate = (income - expenses) / income;
  if (rate > 0.2) return { score: 20, detail: 'Poupas mais de 20% do rendimento.', hasData: true };
  if (rate >= 0.05) return { score: 10, detail: 'Poupança entre 5% e 20%.', hasData: true };
  return { score: 0, detail: 'Poupança abaixo de 5%.', hasData: true };
}

function scoreCashflow(income: number, expenses: number): ComponentScore {
  if (income <= 0 && expenses <= 0) {
    return { score: null, detail: 'Sem dados de fluxo de caixa.', hasData: false };
  }
  if (income <= 0 && expenses > 0) {
    return { score: 0, detail: 'Sem receitas registadas.', hasData: true };
  }
  if (income > expenses) return { score: 20, detail: 'Receitas superiores às despesas.', hasData: true };
  if (Math.abs(income - expenses) < 1) return { score: 10, detail: 'Receitas e despesas equilibradas.', hasData: true };
  return { score: 0, detail: 'Despesas superiores às receitas.', hasData: true };
}

function scoreDebt(
  totalDebt: number,
  income: number,
  creditPayments: number,
): ComponentScore {
  if (totalDebt <= 0) return { score: 20, detail: 'Sem créditos ativos.', hasData: true };
  if (income <= 0) {
    return { score: null, detail: 'Dívida registada — rendimento não disponível.', hasData: false };
  }
  const effort = (creditPayments / income) * 100;
  if (effort < 30) return { score: 10, detail: `Taxa de esforço ${effort.toFixed(0)}% — controlada.`, hasData: true };
  return { score: 0, detail: `Taxa de esforço ${effort.toFixed(0)}% — elevada.`, hasData: true };
}

function scoreBudget(
  budget: number | null | undefined,
  expenses: number,
): ComponentScore {
  if (budget == null || budget <= 0) {
    return { score: null, detail: 'Orçamento não definido.', hasData: false };
  }
  const ratio = expenses / budget;
  if (ratio <= 1) return { score: 20, detail: 'Dentro do orçamento mensal.', hasData: true };
  if (ratio <= 1.1) return { score: 10, detail: 'Até 10% acima do orçamento.', hasData: true };
  return { score: 0, detail: 'Mais de 10% acima do orçamento.', hasData: true };
}

function scoreSubscriptions(subCost: number, income: number): ComponentScore {
  if (subCost <= 0) return { score: 20, detail: 'Sem subscrições registadas.', hasData: true };
  if (income <= 0) {
    return { score: null, detail: 'Subscrições ativas — rendimento não disponível.', hasData: false };
  }
  const ratio = subCost / income;
  if (ratio < 0.05) return { score: 20, detail: 'Subscrições abaixo de 5% do rendimento.', hasData: true };
  if (ratio <= 0.1) return { score: 10, detail: 'Subscrições entre 5% e 10%.', hasData: true };
  return { score: 0, detail: 'Subscrições acima de 10% do rendimento.', hasData: true };
}

function toComponentResult(
  label: string,
  result: ComponentScore,
): HealthScoreResult['components']['savings'] {
  return {
    score: result.score,
    max: 20,
    label,
    detail: result.detail,
    hasData: result.hasData && result.score !== null,
  };
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

  const components = {
    savings: toComponentResult('Poupança', scoreSavings(monthlyIncome, monthlyExpenses)),
    cashflow: toComponentResult('Fluxo de caixa', scoreCashflow(monthlyIncome, monthlyExpenses)),
    debt: toComponentResult('Dívida', scoreDebt(totalDebt, monthlyIncome, creditMonthlyPayments)),
    budget: toComponentResult('Orçamento', scoreBudget(input.monthlyBudget, monthlyExpenses)),
    subscriptions: toComponentResult(
      'Subscrições',
      scoreSubscriptions(monthlySubscriptionCost, monthlyIncome),
    ),
  };

  const transactionCountThisMonth = Number.isFinite(input.transactionCountThisMonth)
    ? input.transactionCountThisMonth
    : 0;

  const hasSufficientData =
    transactionCountThisMonth >= 3 ||
    monthlyIncome > 0 ||
    monthlyExpenses > 0 ||
    totalDebt > 0 ||
    monthlySubscriptionCost > 0;

  let total = 0;
  const scoredComponents = Object.values(components).filter((c) => c.score !== null);
  if (hasSufficientData && scoredComponents.length > 0) {
    const sum = scoredComponents.reduce((acc, c) => acc + (c.score ?? 0), 0);
    total = Math.round((sum / (scoredComponents.length * 20)) * 100);
    total = Math.min(100, Math.max(0, total));
  }

  return {
    total,
    components,
    status: hasSufficientData ? statusFromTotal(total) : 'warning',
    hasSufficientData,
    scoredComponentCount: scoredComponents.length,
  };
}
