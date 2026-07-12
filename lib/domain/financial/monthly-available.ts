/**
 * Orçamento mensal transparente — "Disponível até ao fim do mês".
 * Fonte única para Home (card) e modal (sheet).
 *
 * Disponível = saldo actual em contas elegíveis (budget_enabled) − obrigações futuras.
 * Património total inclui todas as contas; investimentos ficam fora do orçamento.
 */

import type { SpendableWarning } from '@/lib/budget/calculateMonthlySpendable';
import { LOW_BALANCE_THRESHOLD } from '@/lib/budget/calculateMonthlySpendable';
import type { BudgetAccountSnapshot } from '@/lib/domain/financial/budget-accounts';

import { addMoney, roundMoney, subtractMoney } from './money';

export type MonthlyAvailableObligation = {
  id: string;
  name: string;
  amount: number;
  dueDate?: string;
  kind: 'subscription' | 'credit_installment';
};

export type MonthlyAvailableComponents = {
  /** Saldo actual em contas incluídas no orçamento. */
  budgetAccountBalance: number;
  incomeReceived: number;
  /** Despesas pagas por conta elegível (exclui compras no cartão). */
  registeredExpenses: number;
  /** Pagamentos de cartão — saem de conta elegível. */
  creditCardPayments: number;
  /** Compras no cartão — informativo; não reduzem disponível. */
  creditCardPurchases: number;
  goalReserved: number;
  futureObligations: number;
  loanPaymentsPaid: number;
  loanAmortizationsPaid: number;
  financialCharges: number;
  /** Transferências deste mês: orçamento → fora do orçamento. */
  movedOutOfBudget: number;
  /** Transferências deste mês: fora do orçamento → orçamento. */
  movedIntoBudget: number;
};

export type MonthlyAvailableBreakdownInput = {
  /** Soma dos saldos actuais em contas budget_enabled. */
  budgetAccountBalance: number;
  incomeReceived: number;
  registeredExpenses: number;
  creditCardPayments?: number;
  creditCardPurchases?: number;
  goalReserved: number;
  futureObligations: number;
  loanPaymentsPaid?: number;
  loanAmortizationsPaid?: number;
  financialCharges?: number;
  movedOutOfBudget?: number;
  movedIntoBudget?: number;
  consumptionSpending?: number;
  referenceDate?: Date;
};

export type MonthlyAvailableBreakdown = {
  available: number;
  dailySafeSpend: number;
  daysRemaining: number;
  monthEndProjection: number;
  consumptionSpending: number;
  components: MonthlyAvailableComponents;
  /** Contas activas incluídas no orçamento. */
  budgetAccountsIncluded: BudgetAccountSnapshot[];
  /** Contas activas fora do orçamento (ex.: investimentos). */
  budgetAccountsExcluded: BudgetAccountSnapshot[];
  obligations: MonthlyAvailableObligation[];
  warnings: SpendableWarning[];
  notes: string[];
};

function daysRemainingInMonth(reference: Date): number {
  const lastDay = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
  return Math.max(1, lastDay - reference.getDate() + 1);
}

export function calculateMonthlyAvailableBreakdown(
  input: MonthlyAvailableBreakdownInput,
  obligations: MonthlyAvailableObligation[] = [],
  accountSnapshots: {
    included: BudgetAccountSnapshot[];
    excluded: BudgetAccountSnapshot[];
  } = { included: [], excluded: [] },
): MonthlyAvailableBreakdown {
  const reference = input.referenceDate ?? new Date();
  const loanPaymentsPaid = input.loanPaymentsPaid ?? 0;
  const loanAmortizationsPaid = input.loanAmortizationsPaid ?? 0;
  const financialCharges = input.financialCharges ?? 0;
  const creditCardPayments = input.creditCardPayments ?? 0;
  const creditCardPurchases = input.creditCardPurchases ?? 0;
  const movedOutOfBudget = input.movedOutOfBudget ?? 0;
  const movedIntoBudget = input.movedIntoBudget ?? 0;

  const components: MonthlyAvailableComponents = {
    budgetAccountBalance: roundMoney(input.budgetAccountBalance),
    incomeReceived: roundMoney(input.incomeReceived),
    registeredExpenses: roundMoney(input.registeredExpenses),
    creditCardPayments: roundMoney(creditCardPayments),
    creditCardPurchases: roundMoney(creditCardPurchases),
    goalReserved: roundMoney(input.goalReserved),
    futureObligations: roundMoney(input.futureObligations),
    loanPaymentsPaid: roundMoney(loanPaymentsPaid),
    loanAmortizationsPaid: roundMoney(loanAmortizationsPaid),
    financialCharges: roundMoney(financialCharges),
    movedOutOfBudget: roundMoney(movedOutOfBudget),
    movedIntoBudget: roundMoney(movedIntoBudget),
  };

  let available = components.budgetAccountBalance;
  available = subtractMoney(available, components.futureObligations);
  available = roundMoney(available);

  const daysRemaining = daysRemainingInMonth(reference);
  const dailySafeSpend = roundMoney(available / daysRemaining);

  const monthEndProjection = roundMoney(
    subtractMoney(components.budgetAccountBalance, components.futureObligations),
  );

  const consumptionSpending = roundMoney(
    input.consumptionSpending ??
      addMoney(components.registeredExpenses, components.creditCardPurchases),
  );

  const warnings: SpendableWarning[] = [];
  if (available < LOW_BALANCE_THRESHOLD) {
    warnings.push({
      code: 'LOW_BALANCE',
      message: 'Saldo disponível baixo para o resto do mês.',
    });
  }
  if (available < 0) {
    warnings.push({
      code: 'NEGATIVE_PROJECTED',
      message: 'O disponível deste mês é negativo.',
    });
  }

  const notes = [
    'Disponível este mês = saldo acumulado dos movimentos − obrigações futuras.',
    'Compras no cartão entram nos gastos do mês, mas não reduzem o disponível agora.',
    'Amortizações extra reduzem dívida sem contar como consumo.',
  ];

  return {
    available,
    dailySafeSpend,
    daysRemaining,
    monthEndProjection,
    consumptionSpending,
    components,
    budgetAccountsIncluded: accountSnapshots.included,
    budgetAccountsExcluded: accountSnapshots.excluded,
    obligations,
    warnings,
    notes,
  };
}

/** Compatibilidade com hook legado. */
export function breakdownToSpendableOutput(breakdown: MonthlyAvailableBreakdown) {
  return {
    remainingThisMonth: breakdown.available,
    dailyAvailable: breakdown.dailySafeSpend,
    daysRemaining: breakdown.daysRemaining,
    projectedEndOfMonthBalance: breakdown.monthEndProjection,
    warnings: breakdown.warnings,
  };
}
