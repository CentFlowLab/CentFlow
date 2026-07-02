import type { Credit } from '@/lib/domain/types';
import type { Subscription } from '@/lib/domain/assets.types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { isCardCredit } from '@/lib/credit/credit-type.utils';
import { resolveEffectiveAnnualRate } from '@/lib/credit/credit-analysis';

import { getMonthKey } from './dates';
import { debtToIncomeRatio, sumCreditLiabilities, sumMonthlyDebtPayments } from './liabilities';
import { addMoney, roundMoney } from './money';
import { calculateSavingsRate } from './savings';
import { getExpenseTotal, getIncomeTotal } from './transactions';
import { monthlySubscriptionTotal } from './centflow-score';
import type { CashFlowState, InvestmentSummary } from './financial-state.types';

export type FinancialMetrics = {
  savingsRate: number;
  debtRatio: number;
  emergencyMonths: number;
  recurringRatio: number;
  investmentYield?: number;
  debtCost?: number;
  budgetAccuracy: number;
  averageDailySpend: number;
  incomeStability: number;
  expenseConcentration: number;
  subscriptionLoad: number;
  financialRunway: number;
  netWorthGrowth: number;
  goalVelocity: number;
  financialFreedomScore: number;
};

export type CalculateMetricsInput = {
  transactions: Transaction[];
  monthlyIncome: number;
  monthlyExpenses: number;
  availableThisMonth: number;
  dailySafeSpend: number;
  consumptionSpending: number;
  netWorth: number;
  netWorthChangePercent: number;
  totalDebt: number;
  subscriptions: Subscription[];
  goals: Array<{ current: number; target: number }>;
  investmentSummary: InvestmentSummary;
  credits: Credit[];
  asOf: Date;
};

function categoryConcentration(transactions: Transaction[], asOf: Date): number {
  const monthKey = getMonthKey(asOf);
  const period = { kind: 'month' as const, monthKey, asOf };
  const expenses = getExpenseTotal(transactions, period);
  if (expenses <= 0) return 0;

  const byCategory = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== 'expense' && tx.type !== 'credit_card_purchase') continue;
    if (!tx.date.startsWith(monthKey)) continue;
    byCategory.set(tx.category, addMoney(byCategory.get(tx.category) ?? 0, tx.amount));
  }

  const top = Math.max(0, ...byCategory.values());
  return roundMoney((top / expenses) * 100);
}

function incomeStabilityScore(transactions: Transaction[], asOf: Date): number {
  const monthKey = getMonthKey(asOf);
  const income = getIncomeTotal(transactions, { kind: 'month', monthKey, asOf });
  if (income <= 0) return 0;
  const prev = new Date(asOf);
  prev.setMonth(prev.getMonth() - 1);
  const prevKey = getMonthKey(prev);
  const prevIncome = getIncomeTotal(transactions, { kind: 'month', monthKey: prevKey, asOf: prev });
  if (prevIncome <= 0) return 50;
  const delta = Math.abs(income - prevIncome) / prevIncome;
  return roundMoney(Math.max(0, 100 - delta * 100));
}

/** Métricas financeiras derivadas do estado — funções puras. */
export function calculateFinancialMetrics(input: CalculateMetricsInput): FinancialMetrics {
  const savings = calculateSavingsRate(input.monthlyIncome, input.monthlyExpenses);
  const subTotal = monthlySubscriptionTotal(input.subscriptions);
  const debtRatio = debtToIncomeRatio(input.totalDebt, input.monthlyIncome) ?? 0;
  const recurringRatio =
    input.monthlyIncome > 0 ? roundMoney((subTotal / input.monthlyIncome) * 100) : 0;
  const subscriptionLoad = recurringRatio;

  const daysInMonth = new Date(input.asOf.getFullYear(), input.asOf.getMonth() + 1, 0).getDate();
  const averageDailySpend =
    daysInMonth > 0 ? roundMoney(input.consumptionSpending / daysInMonth) : 0;

  const emergencyMonths =
    averageDailySpend > 0
      ? roundMoney(input.availableThisMonth / (averageDailySpend * 30))
      : input.availableThisMonth > 0
        ? 99
        : 0;

  const loanCredits = input.credits.filter((c) => !isCardCredit(c.creditType));
  const taegSum = loanCredits.reduce((sum, c) => {
    const taeg = resolveEffectiveAnnualRate({
      outstandingBalance: c.outstandingBalance,
      interestRateAnnual: c.interestRateAnnual,
      indexRate: c.indexRate,
      spread: c.spread,
      termMonths: c.termMonths,
      monthlyPayment: c.monthlyPayment,
      nextPaymentAmount: c.nextPaymentAmount,
    });
    return taeg > 0 ? sum + taeg : sum;
  }, 0);
  const debtCost = loanCredits.length > 0 ? roundMoney(taegSum / loanCredits.length) : undefined;

  const goalVelocity =
    input.goals.length > 0
      ? roundMoney(
          input.goals.reduce((sum, g) => {
            if (g.target <= 0) return sum;
            return sum + Math.min(100, (g.current / g.target) * 100);
          }, 0) / input.goals.length,
        )
      : 0;

  const budgetAccuracy =
    input.monthlyIncome > 0
      ? roundMoney(
          Math.max(
            0,
            100 - Math.abs(input.availableThisMonth - input.dailySafeSpend * daysInMonth) /
              input.monthlyIncome *
              100,
          ),
        )
      : 0;

  const financialRunway =
    input.monthlyExpenses > 0
      ? roundMoney(input.netWorth / input.monthlyExpenses)
      : input.netWorth > 0
        ? 99
        : 0;

  const financialFreedomScore = roundMoney(
    Math.min(
      100,
      (savings.rate ?? 0) * 0.3 +
        Math.max(0, 100 - debtRatio) * 0.25 +
        Math.min(emergencyMonths * 10, 30) +
        goalVelocity * 0.15 +
        Math.max(0, 100 - subscriptionLoad) * 0.1,
    ),
  );

  return {
    savingsRate: savings.rate ?? 0,
    debtRatio,
    emergencyMonths,
    recurringRatio,
    investmentYield: input.investmentSummary.expectedReturnWeighted,
    debtCost,
    budgetAccuracy,
    averageDailySpend,
    incomeStability: incomeStabilityScore(input.transactions, input.asOf),
    expenseConcentration: categoryConcentration(input.transactions, input.asOf),
    subscriptionLoad,
    financialRunway,
    netWorthGrowth: input.netWorthChangePercent,
    goalVelocity,
    financialFreedomScore,
  };
}

export function buildCashFlowState(
  transactions: Transaction[],
  weeklySpending: number,
  asOf: Date,
): CashFlowState {
  const monthKey = getMonthKey(asOf);
  const period = { kind: 'month' as const, monthKey, asOf };
  const monthlyIncome = getIncomeTotal(transactions, period);
  const monthlyExpenses = getExpenseTotal(transactions, period);
  const savings = calculateSavingsRate(monthlyIncome, monthlyExpenses);

  return {
    monthlyIncome,
    monthlyExpenses,
    net: roundMoney(monthlyIncome - monthlyExpenses),
    savingsRate: savings.rate ?? 0,
    weeklySpending,
  };
}

export function summarizeCreditExposure(credits: Credit[]): {
  totalDebt: number;
  monthlyPayments: number;
  cardCount: number;
  loanCount: number;
} {
  return {
    totalDebt: sumCreditLiabilities(credits),
    monthlyPayments: sumMonthlyDebtPayments(credits),
    cardCount: credits.filter((c) => isCardCredit(c.creditType)).length,
    loanCount: credits.filter((c) => !isCardCredit(c.creditType)).length,
  };
}
