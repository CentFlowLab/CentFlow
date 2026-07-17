import type { Credit } from '@/lib/domain/types';

import { simulateEarlyAmortization } from '@/lib/credit/credit-analysis';
import { isCardCredit } from '@/lib/credit/credit-type.utils';

import { calculateCentFlowScore } from './centflow-score';
import { calculateCreditUtilization } from './credit-cards';
import type { FinancialState } from './financial-state.types';
import { addMoney, formatMoney, roundMoney, subtractMoney } from './money';
import { calculateSavingsRate } from './savings';
import { monthlySubscriptionTotal } from './centflow-score';
import type {
  SimulateFinancialDecisionInput,
  SimulationExplanation,
  SimulationImpactLine,
  SimulationResult,
  SimulationScenario,
  SimulationSnapshot,
  SimulationWarning,
  SimWorkingState,
} from './simulator.types';
import { SIMULATION_DISCLAIMER } from './simulator.types';
export { SIMULATION_DISCLAIMER } from './simulator.types';

export type {
  SimulationScenario,
  SimulationScenarioType,
  SimulationResult,
  SimulateFinancialDecisionInput,
} from './simulator.types';

function cloneWorkingState(state: FinancialState): SimWorkingState {
  return {
    accounts: new Map(state.accounts.map((account) => [account.id, { ...account }])),
    credits: new Map(state.credits.map((credit) => [credit.id, { ...credit }])),
    goals: new Map(state.goalProgress.map((goal) => [goal.id, { ...goal }])),
    subscriptions: state.subscriptions.items.map((sub) => ({ ...sub })),
    availableThisMonth: state.availableThisMonth,
    dailySafeSpend: state.dailySafeSpend,
    monthlyIncome: state.cashFlow.monthlyIncome,
    monthlyExpenses: state.cashFlow.monthlyExpenses,
    daysRemaining: state.budget.daysRemaining,
    inventoryTotal: state.netWorth.breakdown.inventory,
    investmentTotal: state.netWorth.breakdown.investments,
  };
}

function getAccount(working: SimWorkingState, accountId: string) {
  const account = working.accounts.get(accountId);
  if (!account) throw new Error(`Conta não encontrada: ${accountId}`);
  return account;
}

function getCredit(working: SimWorkingState, creditId: string) {
  const credit = working.credits.get(creditId);
  if (!credit) throw new Error(`Crédito não encontrado: ${creditId}`);
  return credit;
}

function getGoal(working: SimWorkingState, goalId: string) {
  const goal = working.goals.get(goalId);
  if (!goal) throw new Error(`Objetivo não encontrado: ${goalId}`);
  return goal;
}

function adjustAccountBalance(working: SimWorkingState, accountId: string, delta: number) {
  const account = getAccount(working, accountId);
  account.balance = roundMoney(addMoney(account.balance, delta));
  working.accounts.set(accountId, account);
}

function adjustBudgetIfNeeded(
  working: SimWorkingState,
  account: { budgetEnabledResolved: boolean },
  delta: number,
) {
  if (!account.budgetEnabledResolved) return;
  working.availableThisMonth = roundMoney(addMoney(working.availableThisMonth, delta));
  working.dailySafeSpend =
    working.daysRemaining > 0
      ? roundMoney(working.availableThisMonth / working.daysRemaining)
      : working.availableThisMonth;
}

function subscriptionMonthlyAmount(sub: { amount: number; billingInterval?: string }): number {
  const interval = sub.billingInterval ?? 'monthly';
  if (interval === 'annual') return roundMoney(sub.amount / 12);
  if (interval === 'quarterly') return roundMoney(sub.amount / 3);
  return sub.amount;
}

function buildSnapshot(working: SimWorkingState): SimulationSnapshot {
  const accounts = [...working.accounts.values()];
  const credits = [...working.credits.values()];
  const goals = [...working.goals.values()];

  const accountsTotal = accounts.reduce((sum, row) => addMoney(sum, row.balance), 0);
  const totalDebt = credits.reduce((sum, row) => addMoney(sum, row.outstandingBalance), 0);
  const netWorth = roundMoney(
    subtractMoney(addMoney(accountsTotal, working.inventoryTotal), totalDebt),
  );

  const loanCredits = credits.filter((credit) => !isCardCredit(credit.creditType));
  const cardCredits = credits.filter((credit) => isCardCredit(credit.creditType));

  const subTotal = monthlySubscriptionTotal(working.subscriptions);
  const savings = calculateSavingsRate(working.monthlyIncome, working.monthlyExpenses);
  const recurringRatio =
    working.monthlyIncome > 0 ? roundMoney((subTotal / working.monthlyIncome) * 100) : 0;

  const healthScore = calculateCentFlowScore({
    netWorth,
    netWorthChangePercent: 0,
    monthlyIncome: working.monthlyIncome,
    monthlyExpenses: working.monthlyExpenses,
    monthlySubscriptionCost: subTotal,
    totalDebt,
    goals: goals.map((goal) => ({ current: goal.current, target: goal.target })),
    subscriptionsRenewingSoon: 0,
    featuredGoalGap: goals[0] ? Math.max(0, goals[0].target - goals[0].current) : null,
    warrantiesExpiringSoon: 0,
    weeklyExpenseDelta: null,
    goalsCount: goals.length,
    transactionCount: 0,
  }).score;

  return {
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      balance: account.balance,
      budgetEnabled: account.budgetEnabledResolved,
    })),
    credits: loanCredits.map((credit) => ({
      id: credit.id,
      name: credit.name,
      balance: credit.outstandingBalance,
    })),
    creditCards: cardCredits.map((credit) => ({
      id: credit.id,
      name: credit.name,
      balance: credit.outstandingBalance,
    })),
    goals: goals.map((goal) => ({
      id: goal.id,
      name: goal.name,
      current: goal.current,
      target: goal.target,
    })),
    availableThisMonth: working.availableThisMonth,
    dailySafeSpend: working.dailySafeSpend,
    netWorth,
    totalDebt,
    monthlyIncome: working.monthlyIncome,
    monthlyExpenses: working.monthlyExpenses,
    savingsRate: savings.rate ?? 0,
    recurringRatio,
    subscriptionMonthlyTotal: subTotal,
    healthScore,
  };
}

function applyScenario(
  working: SimWorkingState,
  scenario: SimulationScenario,
  categorySpending?: Record<string, number>,
): void {
  switch (scenario.type) {
    case 'amortize_credit': {
      const account = getAccount(working, scenario.accountId);
      const credit = getCredit(working, scenario.creditId);
      if (scenario.amount <= 0) throw new Error('Valor inválido');
      if (account.balance < scenario.amount) throw new Error('Saldo insuficiente na conta');
      adjustAccountBalance(working, scenario.accountId, -scenario.amount);
      credit.outstandingBalance = roundMoney(
        Math.max(0, subtractMoney(credit.outstandingBalance, scenario.amount)),
      );
      working.credits.set(credit.id, credit);
      adjustBudgetIfNeeded(working, account, -scenario.amount);
      break;
    }
    case 'pay_credit_card': {
      const account = getAccount(working, scenario.accountId);
      const credit = getCredit(working, scenario.creditId);
      if (!isCardCredit(credit.creditType)) throw new Error('Crédito não é cartão');
      if (scenario.amount <= 0) throw new Error('Valor inválido');
      if (account.balance < scenario.amount) throw new Error('Saldo insuficiente na conta');
      adjustAccountBalance(working, scenario.accountId, -scenario.amount);
      credit.outstandingBalance = roundMoney(
        Math.max(0, subtractMoney(credit.outstandingBalance, scenario.amount)),
      );
      working.credits.set(credit.id, credit);
      adjustBudgetIfNeeded(working, account, -scenario.amount);
      break;
    }
    case 'contribute_goal': {
      const account = getAccount(working, scenario.accountId);
      const goal = getGoal(working, scenario.goalId);
      if (scenario.amount <= 0) throw new Error('Valor inválido');
      if (account.balance < scenario.amount) throw new Error('Saldo insuficiente na conta');
      adjustAccountBalance(working, scenario.accountId, -scenario.amount);
      goal.current = roundMoney(addMoney(goal.current, scenario.amount));
      working.goals.set(goal.id, goal);
      adjustBudgetIfNeeded(working, account, -scenario.amount);
      break;
    }
    case 'withdraw_goal': {
      const account = getAccount(working, scenario.accountId);
      const goal = getGoal(working, scenario.goalId);
      if (scenario.amount <= 0) throw new Error('Valor inválido');
      if (goal.current < scenario.amount) throw new Error('Saldo do objetivo insuficiente');
      goal.current = roundMoney(subtractMoney(goal.current, scenario.amount));
      working.goals.set(goal.id, goal);
      adjustAccountBalance(working, scenario.accountId, scenario.amount);
      adjustBudgetIfNeeded(working, account, scenario.amount);
      break;
    }
    case 'transfer_to_investment': {
      const from = getAccount(working, scenario.fromAccountId);
      const to = getAccount(working, scenario.toAccountId);
      if (scenario.amount <= 0) throw new Error('Valor inválido');
      if (from.balance < scenario.amount) throw new Error('Saldo insuficiente');
      adjustAccountBalance(working, scenario.fromAccountId, -scenario.amount);
      adjustAccountBalance(working, scenario.toAccountId, scenario.amount);
      adjustBudgetIfNeeded(working, from, -scenario.amount);
      if (to.type === 'investment') {
        working.investmentTotal = roundMoney(addMoney(working.investmentTotal, scenario.amount));
      }
      break;
    }
    case 'withdraw_investment': {
      const from = getAccount(working, scenario.fromAccountId);
      const to = getAccount(working, scenario.toAccountId);
      if (scenario.amount <= 0) throw new Error('Valor inválido');
      if (from.balance < scenario.amount) throw new Error('Saldo insuficiente');
      adjustAccountBalance(working, scenario.fromAccountId, -scenario.amount);
      adjustAccountBalance(working, scenario.toAccountId, scenario.amount);
      adjustBudgetIfNeeded(working, to, scenario.amount);
      if (from.type === 'investment') {
        working.investmentTotal = roundMoney(
          Math.max(0, subtractMoney(working.investmentTotal, scenario.amount)),
        );
      }
      break;
    }
    case 'cancel_subscription': {
      const index = working.subscriptions.findIndex((sub) => sub.id === scenario.subscriptionId);
      if (index < 0) throw new Error('Subscrição não encontrada');
      const sub = working.subscriptions[index];
      const monthly = subscriptionMonthlyAmount(sub);
      const obligation = working.availableThisMonth;
      working.subscriptions = working.subscriptions.filter((row) => row.id !== scenario.subscriptionId);
      const futureObligationRemoved = working.subscriptions.length < index + 1;
      if (futureObligationRemoved) {
        working.availableThisMonth = roundMoney(addMoney(working.availableThisMonth, monthly));
        working.dailySafeSpend =
          working.daysRemaining > 0
            ? roundMoney(working.availableThisMonth / working.daysRemaining)
            : working.availableThisMonth;
      }
      void obligation;
      break;
    }
    case 'increase_monthly_savings': {
      if (scenario.amount <= 0) throw new Error('Valor inválido');
      working.availableThisMonth = roundMoney(subtractMoney(working.availableThisMonth, scenario.amount));
      working.dailySafeSpend =
        working.daysRemaining > 0
          ? roundMoney(Math.max(0, working.availableThisMonth / working.daysRemaining))
          : working.availableThisMonth;
      break;
    }
    case 'reduce_category_spending': {
      const current = categorySpending?.[scenario.categoryKey] ?? 0;
      const reduction =
        scenario.reductionAmount ??
        (scenario.reductionPercent != null
          ? roundMoney(current * (scenario.reductionPercent / 100))
          : 0);
      if (reduction <= 0) throw new Error('Redução inválida');
      working.monthlyExpenses = roundMoney(Math.max(0, subtractMoney(working.monthlyExpenses, reduction)));
      const added = roundMoney(working.availableThisMonth + reduction);
      working.availableThisMonth = added;
      working.dailySafeSpend =
        working.daysRemaining > 0 ? roundMoney(added / working.daysRemaining) : added;
      break;
    }
    case 'increase_monthly_income': {
      if (scenario.amount <= 0) throw new Error('Valor inválido');
      working.monthlyIncome = roundMoney(addMoney(working.monthlyIncome, scenario.amount));
      working.availableThisMonth = roundMoney(addMoney(working.availableThisMonth, scenario.amount));
      working.dailySafeSpend =
        working.daysRemaining > 0
          ? roundMoney(working.availableThisMonth / working.daysRemaining)
          : working.availableThisMonth;
      break;
    }
    default:
      break;
  }
}

function scenarioTitle(scenario: SimulationScenario, state: FinancialState): string {
  switch (scenario.type) {
    case 'amortize_credit': {
      const credit = state.credits.find((row) => row.id === scenario.creditId);
      return `Amortizar ${formatMoney(scenario.amount)} — ${credit?.name ?? 'crédito'}`;
    }
    case 'pay_credit_card': {
      const card = state.creditCards.find((row) => row.credit.id === scenario.creditId);
      return `Registar pagamento ${formatMoney(scenario.amount)} — ${card?.credit.name ?? 'cartão'}`;
    }
    case 'contribute_goal': {
      const goal = state.goalProgress.find((row) => row.id === scenario.goalId);
      return `Reforçar objetivo — ${goal?.name ?? 'objetivo'}`;
    }
    case 'withdraw_goal':
      return 'Retirar do objetivo';
    case 'transfer_to_investment':
      return 'Transferir para investimento';
    case 'withdraw_investment':
      return 'Retirar de investimento';
    case 'cancel_subscription': {
      const sub = state.subscriptions.items.find((row) => row.id === scenario.subscriptionId);
      return `Cancelar ${sub?.name ?? 'subscrição'}`;
    }
    case 'increase_monthly_savings':
      return `Aumentar poupança mensal em ${formatMoney(scenario.amount)}`;
    case 'reduce_category_spending':
      return `Reduzir ${scenario.categoryLabel ?? scenario.categoryKey}`;
    case 'increase_monthly_income':
      return `Aumentar rendimento em ${formatMoney(scenario.amount)}/mês`;
    default:
      return 'Simulação financeira';
  }
}

function buildImpact(before: SimulationSnapshot, after: SimulationSnapshot): SimulationImpactLine[] {
  const lines: SimulationImpactLine[] = [];

  const pushMoney = (
    label: string,
    beforeValue: number,
    afterValue: number,
    invertTone = false,
  ) => {
    const delta = roundMoney(afterValue - beforeValue);
    if (delta === 0 && beforeValue === afterValue) return;
    const tone =
      delta === 0
        ? 'neutral'
        : (delta > 0) === !invertTone
          ? 'positive'
          : 'negative';
    lines.push({
      label,
      before: formatMoney(beforeValue),
      after: formatMoney(afterValue),
      delta: delta !== 0 ? `${delta > 0 ? '+' : ''}${formatMoney(delta)}` : undefined,
      tone,
    });
  };

  pushMoney('Disponível este mês', before.availableThisMonth, after.availableThisMonth);
  pushMoney('Património líquido', before.netWorth, after.netWorth);
  pushMoney('Dívida total', before.totalDebt, after.totalDebt, true);
  pushMoney('Gasto diário seguro', before.dailySafeSpend, after.dailySafeSpend);
  pushMoney('Rendimento mensal', before.monthlyIncome, after.monthlyIncome);
  pushMoney('Despesas mensais', before.monthlyExpenses, after.monthlyExpenses, true);

  if (before.savingsRate !== after.savingsRate) {
    lines.push({
      label: 'Taxa de poupança',
      before: `${before.savingsRate.toFixed(1)}%`,
      after: `${after.savingsRate.toFixed(1)}%`,
      delta: `${(after.savingsRate - before.savingsRate).toFixed(1)} pp`,
      tone: after.savingsRate >= before.savingsRate ? 'positive' : 'negative',
    });
  }

  if (before.healthScore !== after.healthScore) {
    lines.push({
      label: 'CentFlow Score',
      before: String(before.healthScore),
      after: String(after.healthScore),
      delta: `${after.healthScore - before.healthScore >= 0 ? '+' : ''}${after.healthScore - before.healthScore}`,
      tone: after.healthScore >= before.healthScore ? 'positive' : 'negative',
    });
  }

  return lines;
}

function buildExplanation(
  scenario: SimulationScenario,
  before: SimulationSnapshot,
  after: SimulationSnapshot,
  state: FinancialState,
): SimulationExplanation {
  const changes: string[] = [];
  const unchanged: string[] = [];
  const risks: string[] = [];
  const benefits: string[] = [];

  switch (scenario.type) {
    case 'amortize_credit':
      changes.push('A conta de origem baixa.', 'A dívida do crédito reduz.');
      if (after.availableThisMonth < before.availableThisMonth) {
        changes.push('O orçamento mensal disponível baixa se a conta for de gasto corrente.');
      }
      unchanged.push('Património líquido mantém-se aproximadamente igual (activo → menos passivo).');
      unchanged.push('Gastos de consumo do mês não aumentam.');
      benefits.push('Menor risco de dívida.', 'Possível redução de juros futuros.');
      if (after.availableThisMonth < 500) {
        risks.push('Liquidez reduzida — verifica o colchão de emergência.');
      }
      break;
    case 'pay_credit_card':
      changes.push('A conta baixa.', 'A dívida do cartão reduz.', 'Utilização do cartão melhora.');
      unchanged.push('Não entra como novo gasto de consumo.');
      benefits.push('Menos juros de cartão se evitares saldo em dívida.');
      break;
    case 'contribute_goal':
      changes.push('Conta baixa.', 'Objetivo aumenta.', 'Orçamento disponível baixa.');
      unchanged.push('Património líquido mantém-se (reserva mental).');
      benefits.push('Mais próximo da meta de poupança.');
      break;
    case 'withdraw_goal':
      changes.push('Objetivo baixa.', 'Conta aumenta.', 'Orçamento disponível sobe.');
      unchanged.push('Património total inalterado.');
      risks.push('Menos colchão para a meta.');
      break;
    case 'transfer_to_investment':
      changes.push('Orçamento disponível baixa se sair de conta de gasto corrente.');
      unchanged.push('Património total mantém-se.');
      benefits.push('Mais capital a render (estimativa).');
      risks.push('Menos liquidez imediata.');
      break;
    case 'withdraw_investment':
      changes.push('Orçamento disponível sobe se entrar em conta de gasto corrente.');
      unchanged.push('Património total mantém-se.');
      benefits.push('Mais liquidez para despesas.');
      break;
    case 'cancel_subscription': {
      const sub = state.subscriptions.items.find((row) => row.id === scenario.subscriptionId);
      const monthly = sub ? subscriptionMonthlyAmount(sub) : 0;
      changes.push(`Liberta cerca de ${formatMoney(monthly)}/mês.`);
      unchanged.push('Movimentos passados não são alterados.');
      benefits.push('Recurring ratio melhora.', 'Mais margem no orçamento futuro.');
      break;
    }
    case 'increase_monthly_savings':
      changes.push('Disponível mensal reduz (compromisso de poupança).');
      benefits.push('Taxa de poupança efectiva sobe.');
      risks.push('Menos margem para imprevistos.');
      break;
    case 'reduce_category_spending':
      changes.push('Despesa mensal estimada baixa.', 'Gasto diário seguro sobe.');
      unchanged.push('Não altera movimentos já registados.');
      benefits.push('Taxa de poupança melhora.');
      break;
    case 'increase_monthly_income':
      changes.push('Cashflow mensal melhora.', 'Disponível sobe (simulação de novo rendimento).');
      benefits.push('Mais margem no orçamento.');
      break;
    default:
      break;
  }

  const summary = `${changes[0] ?? 'Impacto calculado.'} ${unchanged[0] ?? ''}`.trim();

  return { changes, unchanged, risks, benefits, summary };
}

function buildWarnings(
  scenario: SimulationScenario,
  before: SimulationSnapshot,
  after: SimulationSnapshot,
  working: SimWorkingState,
): SimulationWarning[] {
  const warnings: SimulationWarning[] = [];

  if (after.availableThisMonth < 0) {
    warnings.push({
      code: 'NEGATIVE_BUDGET',
      message: 'Esta simulação deixaria o orçamento mensal negativo.',
    });
  }

  if (scenario.type === 'amortize_credit' || scenario.type === 'pay_credit_card') {
    try {
      const account = working.accounts.get(
        scenario.type === 'amortize_credit' ? scenario.accountId : scenario.accountId,
      );
      if (account && account.balance < 200) {
        warnings.push({
          code: 'LOW_LIQUIDITY',
          message: 'A conta de origem ficaria com pouca liquidez.',
        });
      }
    } catch {
      // ignore
    }
  }

  if (before.netWorth !== 0 && Math.abs(after.netWorth - before.netWorth) > 1) {
    if (scenario.type === 'transfer_to_investment' || scenario.type === 'withdraw_investment') {
      // expected small drift ok
    } else if (
      scenario.type !== 'amortize_credit' &&
      scenario.type !== 'pay_credit_card' &&
      scenario.type !== 'contribute_goal' &&
      scenario.type !== 'withdraw_goal'
    ) {
      warnings.push({
        code: 'NET_WORTH_SHIFT',
        message: 'Património líquido altera-se — verifica a explicação.',
      });
    }
  }

  return warnings;
}

function buildRecommendation(
  scenario: SimulationScenario,
  after: SimulationSnapshot,
  warnings: SimulationWarning[],
): string {
  if (warnings.some((warning) => warning.code === 'NEGATIVE_BUDGET')) {
    return 'Revê o valor ou adia a decisão — o orçamento ficaria negativo.';
  }

  switch (scenario.type) {
    case 'amortize_credit':
      return after.totalDebt < 1000
        ? 'Reduzir dívida pode ser sensato se mantiveres liquidez suficiente.'
        : 'Confirma que não precisas desse capital a curto prazo antes de amortizar.';
    case 'cancel_subscription':
      return 'Se usas pouco o serviço, cancelar liberta margem todos os meses.';
    case 'reduce_category_spending':
      return 'Pequenas reduções consistentes têm impacto composto ao fim do ano.';
    default:
      return SIMULATION_DISCLAIMER;
  }
}

function estimateInterestSaved(scenario: SimulationScenario, credit: Credit): number | null {
  if (scenario.type !== 'amortize_credit') return null;
  const payment = credit.monthlyPayment ?? credit.nextPaymentAmount ?? 0;
  const rate = credit.interestRateAnnual ?? 0;
  const result = simulateEarlyAmortization(
    credit.outstandingBalance,
    payment,
    rate,
    scenario.amount,
  );
  return result?.interestSaved ?? null;
}

/** Simula uma decisão financeira — nunca altera dados reais. */
export function simulateFinancialDecision(
  input: SimulateFinancialDecisionInput,
): SimulationResult {
  const beforeWorking = cloneWorkingState(input.financialState);
  const before = buildSnapshot(beforeWorking);

  const afterWorking = cloneWorkingState(input.financialState);
  applyScenario(afterWorking, input.scenario, input.categorySpending);
  const after = buildSnapshot(afterWorking);

  const warnings = buildWarnings(input.scenario, before, after, afterWorking);
  const explanation = buildExplanation(input.scenario, before, after, input.financialState);
  const impact = buildImpact(before, after);
  const recommendation = buildRecommendation(input.scenario, after, warnings);

  const scenario = input.scenario;

  if (scenario.type === 'amortize_credit') {
    const credit = input.financialState.credits.find((row) => row.id === scenario.creditId);
    if (credit) {
      const saved = estimateInterestSaved(scenario, credit);
      if (saved != null && saved > 0) {
        explanation.benefits.push(`Juros futuros estimados poupa: ~${formatMoney(saved)}.`);
      }
    }
  }

  if (scenario.type === 'cancel_subscription') {
    const sub = input.financialState.subscriptions.items.find(
      (row) => row.id === scenario.subscriptionId,
    );
    if (sub) {
      const monthly = subscriptionMonthlyAmount(sub);
      explanation.summary = `Cancelar ${sub.name} libertaria ${formatMoney(monthly)}/mês, ou ${formatMoney(monthly * 12)}/ano.`;
    }
  }

  return {
    scenarioType: input.scenario.type,
    title: scenarioTitle(input.scenario, input.financialState),
    before,
    after,
    impact,
    explanation,
    warnings,
    recommendation,
    isReadOnly: true,
  };
}

/** Presets rápidos para cards de simulação. */
export const SIMULATION_PRESETS: Array<{
  type: SimulationScenario['type'];
  label: string;
  description: string;
  icon: string;
}> = [
  { type: 'amortize_credit', label: 'Amortizar dívida', description: 'Reduz crédito, mantém PL', icon: 'percent' },
  { type: 'pay_credit_card', label: 'Registar pagamento', description: 'Baixa dívida do cartão', icon: 'credit_card' },
  { type: 'contribute_goal', label: 'Reforçar objetivo', description: 'Reserva no objetivo', icon: 'flag' },
  { type: 'cancel_subscription', label: 'Cortar recorrente', description: 'Liberta margem mensal', icon: 'subscriptions' },
  { type: 'reduce_category_spending', label: 'Reduzir categoria', description: 'Optimiza gastos', icon: 'trending_down' },
  { type: 'increase_monthly_savings', label: 'Aumentar poupança', description: 'Compromisso mensal', icon: 'savings' },
];

export function buildScenarioFromSuggestionId(
  suggestionId: string,
  state: FinancialState,
): SimulationScenario | null {
  if (suggestionId.startsWith('fin-amort-')) {
    const creditId = suggestionId.replace('fin-amort-', '');
    const credit = state.credits.find((row) => row.id === creditId);
    const investmentAccount = state.accounts.find((row) => row.type === 'investment' && row.isActive);
    const finSuggestion = state.financialSuggestions.find((row) => row.id === suggestionId);
    const amount = finSuggestion?.scenarios[0]?.amount ?? 0;
    if (!credit || !investmentAccount || amount <= 0) return null;
    return { type: 'amortize_credit', creditId, accountId: investmentAccount.id, amount };
  }

  if (suggestionId.startsWith('fin-high-taeg-')) {
    const creditId = suggestionId.replace('fin-high-taeg-', '');
    const credit = state.credits.find((row) => row.id === creditId);
    const account =
      state.accounts.find((row) => row.type === 'investment' && row.isActive) ??
      state.accounts.find((row) => row.budgetEnabledResolved);
    if (!credit || !account) return null;
    const amount = roundMoney(Math.min(account.balance * 0.1, credit.outstandingBalance * 0.1));
    if (amount <= 0) return null;
    return { type: 'amortize_credit', creditId, accountId: account.id, amount };
  }

  return null;
}

export function creditUtilizationAfterPayment(
  credit: Credit,
  paymentAmount: number,
): number | null {
  const newBalance = roundMoney(Math.max(0, subtractMoney(credit.outstandingBalance, paymentAmount)));
  return calculateCreditUtilization({ ...credit, outstandingBalance: newBalance });
}
