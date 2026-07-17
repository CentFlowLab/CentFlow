import type { Transaction } from '@/lib/domain/transaction.types';
import type { Credit } from '@/lib/domain/types';
import type { RecommendationFiredRecord } from '@/lib/storage/recommendation-fired.storage';

import {
  resolveEffectiveAnnualRate,
  simulateEarlyAmortization,
} from '@/lib/credit/credit-analysis';
import { isCardCredit } from '@/lib/credit/credit-type.utils';

import { buildDebtAmortizationAction } from './debt-amortization-action';
import { getPreviousCompleteMonthKeys } from './category-budgets';
import { getCurrentMonthRange, getMonthKey, type FinancialPeriod } from './dates';
import { resolveDebtEffectiveAnnualRate } from './debt-priority';
import { buildSavingsAllocationAction } from './savings-allocation';
import {
  calculateMedian,
  calculateRealSavingsMargin,
  isOneOffVariableCategory,
} from './savings-margin';
import { DEFAULT_INVESTMENT_RETURN_PERCENT } from './suggestions';
import { countsAsBudgetExpense } from './transaction-kind';
import { groupTransactionsByCategory } from './transactions';
import { formatMoney, roundMoney } from './money';
import { sumMonthlyDebtPayments } from './liabilities';
import { buildHabitDeviationMessage, buildHabitDeviationTitle, detectSpendingHabits, findHabitDeviations } from './habits';
import { emergencyMonthsCovered } from './safe-math';
import type { FinancialState } from './financial-state.types';

export type RecommendationPriority = 'alta' | 'média' | 'baixa';

export type RecommendationRuleId =
  | 'debt_vs_investment'
  | 'surplus_allocation'
  | 'category_above_median'
  | 'emergency_fund'
  | 'habit_insight';

export type RecommendationRuleSettings = Record<RecommendationRuleId, boolean>;

export const DEFAULT_RECOMMENDATION_RULE_SETTINGS: RecommendationRuleSettings = {
  debt_vs_investment: true,
  surplus_allocation: true,
  category_above_median: true,
  emergency_fund: true,
  habit_insight: true,
};

export type Recommendation = {
  id: string;
  ruleId: RecommendationRuleId;
  priority: RecommendationPriority;
  title: string;
  explanation: string;
  suggestedAction: string;
  fingerprint: string;
  ctaRoute?: string;
  /** Padrão de hábito associado — permite ignorar falsos positivos. */
  habitId?: string;
};

export type GenerateRecommendationsContext = {
  transactions: Transaction[];
  settings?: Partial<RecommendationRuleSettings>;
  lastFired?: RecommendationFiredRecord[];
  asOf?: Date;
  prioritizeDebtAmortization?: boolean;
  categoryMedianThreshold?: number;
  ignoredHabitIds?: string[];
};

const MIN_DEBT_RATE_SPREAD = 2;
const MIN_SURPLUS_AMOUNT = 10;
const EMERGENCY_MONTHS_TARGET = 3;
const CATEGORY_MONTHS_ABOVE_REQUIRED = 2;

function monthPeriod(monthKey: string, asOf: Date): FinancialPeriod {
  return { kind: 'month', monthKey, asOf };
}

function resolveSettings(
  partial?: Partial<RecommendationRuleSettings>,
): RecommendationRuleSettings {
  return { ...DEFAULT_RECOMMENDATION_RULE_SETTINGS, ...partial };
}

function investmentReturnPercent(state: FinancialState): number {
  return (
    state.investmentSummary.expectedReturnWeighted ?? DEFAULT_INVESTMENT_RETURN_PERCENT
  );
}

function suggestedAmortizationAmount(
  outstandingBalance: number,
  availableThisMonth: number,
): number {
  const pool = roundMoney(Math.max(0, availableThisMonth) * 0.2);
  const capped = Math.min(pool, outstandingBalance, 500);
  return Math.max(0, Math.ceil(capped / 5) * 5);
}

function estimateAnnualInterestSaved(
  credit: Credit,
  amount: number,
  annualRate: number,
): number {
  const monthlyPayment = credit.monthlyPayment ?? credit.nextPaymentAmount ?? 0;
  if (amount <= 0 || monthlyPayment <= 0) {
    return roundMoney((credit.outstandingBalance * annualRate) / 100);
  }
  const simulation = simulateEarlyAmortization(
    credit.outstandingBalance,
    monthlyPayment,
    annualRate,
    amount,
  );
  if (!simulation || simulation.monthsSaved <= 0) {
    return roundMoney((amount * annualRate) / 100);
  }
  const yearsSaved = simulation.monthsSaved / 12;
  if (yearsSaved <= 0) return roundMoney(simulation.interestSaved);
  return roundMoney(simulation.interestSaved / yearsSaved);
}

function buildDebtVsInvestmentRecommendations(
  state: FinancialState,
  settings: RecommendationRuleSettings,
): Recommendation[] {
  if (!settings.debt_vs_investment) return [];

  const investmentReturn = investmentReturnPercent(state);
  const results: Recommendation[] = [];

  for (const credit of state.credits) {
    if (credit.outstandingBalance <= 0) continue;

    const annualRate = resolveDebtEffectiveAnnualRate(credit);
    if (annualRate === null || annualRate <= investmentReturn + MIN_DEBT_RATE_SPREAD) {
      continue;
    }

    const amount = suggestedAmortizationAmount(
      credit.outstandingBalance,
      state.availableThisMonth,
    );
    if (amount <= 0) continue;

    const annualSavings = estimateAnnualInterestSaved(credit, amount, annualRate);
    const rateLabel = isCardCredit(credit.creditType) ? 'TAN efectiva' : 'TAEG';
    const fingerprint = `${credit.outstandingBalance}|${annualRate}|${investmentReturn}|${amount}`;

    results.push({
      id: `rec-debt-vs-inv-${credit.id}`,
      ruleId: 'debt_vs_investment',
      priority: annualRate - investmentReturn >= 8 ? 'alta' : 'média',
      title: isCardCredit(credit.creditType)
        ? 'Cartão com taxa acima do investimento'
        : 'Crédito com taxa acima do investimento',
      explanation: `"${credit.name}" a ~${annualRate.toFixed(1)}%/${rateLabel} vs investimento a ~${investmentReturn.toFixed(1)}%/ano — amortizar ${formatMoney(amount)} poupa aproximadamente ${formatMoney(annualSavings)}/ano em juros.`,
      suggestedAction: isCardCredit(credit.creditType)
        ? `Amortizar ${formatMoney(amount)} no cartão ${credit.name}`
        : `Amortizar ${formatMoney(amount)} no crédito ${credit.name}`,
      fingerprint,
      ctaRoute: '/(tabs)/creditos',
    });
  }

  return results;
}

function buildSurplusAllocationRecommendations(
  state: FinancialState,
  context: GenerateRecommendationsContext,
  settings: RecommendationRuleSettings,
): Recommendation[] {
  if (!settings.surplus_allocation) return [];

  const asOf = context.asOf ?? state.asOf;
  const margin = calculateRealSavingsMargin(
    state.availableThisMonth,
    context.transactions ?? [],
    asOf,
  );

  if (margin.cappedActionBudget < MIN_SURPLUS_AMOUNT) return [];

  const prioritizeDebt = context.prioritizeDebtAmortization ?? true;

  if (prioritizeDebt) {
    const debtAction = buildDebtAmortizationAction({
      margin,
      credits: state.credits,
      prioritizeDebt: true,
    });
    if (!debtAction) return [];

    const fingerprint = `${margin.cappedActionBudget}|debt|${debtAction.creditId}|${debtAction.amount}`;
    return [
      {
        id: `rec-surplus-debt-${debtAction.creditId}`,
        ruleId: 'surplus_allocation',
        priority: 'média',
        title: 'Excedente sem destino definido',
        explanation: `Margem estimada de ${formatMoney(margin.cappedActionBudget)} (disponível ${formatMoney(margin.availableThisMonth)} − projeção variável ${formatMoney(margin.variableProjection)}). A dívida "${debtAction.creditName}" tem prioridade face aos objetivos.`,
        suggestedAction: `Amortizar ${formatMoney(debtAction.amount)} em ${debtAction.creditName}`,
        fingerprint,
        ctaRoute: '/(tabs)/creditos',
      },
    ];
  }

  const allocation = buildSavingsAllocationAction({
    margin,
    goals: state.goalProgress.map((goal) => ({
      id: goal.id,
      name: goal.name,
      target: goal.target,
      current: goal.current,
    })),
  });
  if (!allocation) return [];

  const fingerprint = `${margin.cappedActionBudget}|goal|${allocation.goalId}|${allocation.amount}`;
  return [
    {
      id: `rec-surplus-goal-${allocation.goalId}`,
      ruleId: 'surplus_allocation',
      priority: 'média',
      title: 'Excedente disponível para poupar',
      explanation: `Margem estimada de ${formatMoney(margin.cappedActionBudget)} após reservar ~${Math.round(margin.capRatio * 100)}% de almofada. Objetivo "${allocation.goalName}" está com menor progresso relativo.`,
      suggestedAction: `Alocar ${formatMoney(allocation.amount)} ao objetivo ${allocation.goalName}`,
      fingerprint,
      ctaRoute: '/(tabs)/ativos?tab=objetivos',
    },
  ];
}

function categoryMonthlySpend(
  transactions: Transaction[],
  category: string,
  monthKey: string,
  asOf: Date,
): number {
  const grouped = groupTransactionsByCategory(transactions, monthPeriod(monthKey, asOf));
  return roundMoney(grouped.find((item) => item.key === category)?.amount ?? 0);
}

function buildCategoryMedianRecommendations(
  state: FinancialState,
  context: GenerateRecommendationsContext,
  settings: RecommendationRuleSettings,
): Recommendation[] {
  if (!settings.category_above_median) return [];

  const asOf = context.asOf ?? state.asOf;
  const threshold = context.categoryMedianThreshold ?? 1.2;
  const monthKeys = getPreviousCompleteMonthKeys(3, asOf);
  const { monthKey: currentMonthKey } = getCurrentMonthRange(asOf);

  const categories = new Set<string>();
  for (const tx of context.transactions ?? []) {
    if (!countsAsBudgetExpense(tx)) continue;
    if (isOneOffVariableCategory(tx.category)) continue;
    categories.add(tx.category);
  }

  const results: Recommendation[] = [];

  for (const category of categories) {
    const historicalTotals = monthKeys.map((monthKey) =>
      categoryMonthlySpend(context.transactions, category, monthKey, asOf),
    );
    const baselineMedian = calculateMedian(historicalTotals.filter((value) => value > 0));
    if (baselineMedian <= 0) continue;

    const monthsAbove = historicalTotals.filter(
      (value) => value > baselineMedian * threshold,
    ).length;
    const currentSpend = categoryMonthlySpend(
      context.transactions,
      category,
      currentMonthKey,
      asOf,
    );
    const currentAbove = currentSpend > baselineMedian * threshold;

    if (monthsAbove < CATEGORY_MONTHS_ABOVE_REQUIRED && !currentAbove) continue;

    const label =
      groupTransactionsByCategory(context.transactions, monthPeriod(currentMonthKey, asOf)).find(
        (item) => item.key === category,
      )?.label ?? category;

    const fingerprint = `${category}|${baselineMedian}|${currentSpend}|${monthsAbove}`;

    results.push({
      id: `rec-category-median-${category}`,
      ruleId: 'category_above_median',
      priority: monthsAbove >= 3 ? 'alta' : 'média',
      title: `${label} acima do habitual`,
      explanation: `Gasto médio histórico de ${formatMoney(baselineMedian)}/mês; este mês já ${formatMoney(currentSpend)} (${monthsAbove} dos últimos 3 meses acima de ${Math.round(threshold * 100)}% da mediana).`,
      suggestedAction: `Rever gastos em ${label}`,
      fingerprint,
      ctaRoute: '/(tabs)/analises?tab=gastos',
    });
  }

  return results;
}

function buildEmergencyFundRecommendations(
  state: FinancialState,
  settings: RecommendationRuleSettings,
): Recommendation[] {
  if (!settings.emergency_fund) return [];

  const fixedMonthly = roundMoney(
    state.subscriptions.monthlyTotal + sumMonthlyDebtPayments(state.credits),
  );
  const monthsCovered = emergencyMonthsCovered(state.availableThisMonth, fixedMonthly);
  if (monthsCovered == null || monthsCovered >= EMERGENCY_MONTHS_TARGET) return [];

  const openGoals = state.goalProgress.filter((goal) => !goal.isComplete);
  if (openGoals.length === 0) return [];

  const fingerprint = `${state.availableThisMonth}|${fixedMonthly}|${monthsCovered.toFixed(2)}`;

  return [
    {
      id: 'rec-emergency-fund',
      ruleId: 'emergency_fund',
      priority: monthsCovered < 1 ? 'alta' : 'média',
      title: 'Fundo de emergência curto',
      explanation: `O disponível ${formatMoney(state.availableThisMonth)} cobre cerca de ${monthsCovered.toFixed(1)} meses de despesas fixas (${formatMoney(fixedMonthly)}/mês em subscrições e prestações). Recomendado: pelo menos ${EMERGENCY_MONTHS_TARGET} meses antes de acelerar outros objetivos.`,
      suggestedAction: 'Priorizar poupança de emergência este mês',
      fingerprint,
      ctaRoute: '/(tabs)/ativos?tab=objetivos',
    },
  ];
}

function buildHabitInsightRecommendations(
  context: GenerateRecommendationsContext,
  settings: RecommendationRuleSettings,
): Recommendation[] {
  if (!settings.habit_insight) return [];

  const asOf = context.asOf ?? new Date();
  const transactions = context.transactions ?? [];
  const habits = detectSpendingHabits(transactions, {
    asOf,
    ignoredHabitIds: context.ignoredHabitIds,
  });
  const deviations = findHabitDeviations(transactions, habits, { asOf });

  return deviations.map(({ habit, transactionId, actualAmount }) => {
    const fingerprint = `${habit.id}|${actualAmount}|${transactionId}`;
    return {
      id: `rec-habit-${habit.id}`,
      ruleId: 'habit_insight',
      priority: 'baixa',
      title: buildHabitDeviationTitle(habit),
      explanation: buildHabitDeviationMessage(habit, actualAmount),
      suggestedAction: 'Ver movimentos desta semana',
      fingerprint,
      ctaRoute: '/(tabs)/movimentos',
      habitId: habit.id,
    };
  });
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayDifference(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Evita repetir a mesma recomendação em dias consecutivos se os números não mudaram. */
export function filterConsecutiveRecommendationDuplicates(
  recommendations: Recommendation[],
  lastFired: RecommendationFiredRecord[],
  asOf: Date = new Date(),
): Recommendation[] {
  return recommendations.filter((rec) => {
    const record = lastFired.find((item) => item.id === rec.id);
    if (!record) return true;
    if (record.fingerprint !== rec.fingerprint) return true;
    const days = dayDifference(new Date(record.firedAt), asOf);
    return days > 1;
  });
}

export function mergeRecommendationFiredRecords(
  visible: Recommendation[],
  previous: RecommendationFiredRecord[],
  asOf: Date = new Date(),
): RecommendationFiredRecord[] {
  const firedAt = asOf.toISOString();
  const byId = new Map(previous.map((item) => [item.id, item]));

  for (const rec of visible) {
    byId.set(rec.id, {
      id: rec.id,
      ruleId: rec.ruleId,
      fingerprint: rec.fingerprint,
      firedAt,
    });
  }

  return [...byId.values()];
}

/**
 * Motor determinístico de recomendações — regras auditáveis sobre dados reais.
 * Sem LLM; cada sugestão inclui os números que a originaram.
 */
export function generateRecommendations(
  financialState: FinancialState,
  context: GenerateRecommendationsContext = { transactions: [] },
): Recommendation[] {
  const settings = resolveSettings(context.settings);
  const asOf = context.asOf ?? financialState.asOf;
  const transactions = context.transactions ?? [];

  const candidates = [
    ...buildDebtVsInvestmentRecommendations(financialState, settings),
    ...buildSurplusAllocationRecommendations(financialState, { ...context, transactions }, settings),
    ...buildCategoryMedianRecommendations(financialState, { ...context, transactions }, settings),
    ...buildEmergencyFundRecommendations(financialState, settings),
    ...buildHabitInsightRecommendations({ ...context, transactions }, settings),
  ];

  const priorityRank: Record<RecommendationPriority, number> = {
    alta: 3,
    média: 2,
    baixa: 1,
  };

  const sorted = candidates.sort(
    (a, b) => priorityRank[b.priority] - priorityRank[a.priority],
  );

  const filtered = filterConsecutiveRecommendationDuplicates(
    sorted,
    context.lastFired ?? [],
    asOf,
  );

  return filtered;
}
