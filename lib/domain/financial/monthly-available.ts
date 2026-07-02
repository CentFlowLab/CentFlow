/**
 * Orçamento mensal transparente — "Disponível até ao fim do mês".
 * Fonte única para Home (card) e modal (sheet).
 */

import type { SpendableWarning } from '@/lib/budget/calculateMonthlySpendable';
import { LOW_BALANCE_THRESHOLD } from '@/lib/budget/calculateMonthlySpendable';

import { addMoney, roundMoney, subtractMoney } from './money';

export type MonthlyAvailableObligation = {
  id: string;
  name: string;
  amount: number;
  dueDate?: string;
  kind: 'subscription' | 'credit_installment';
};

export type MonthlyAvailableComponents = {
  incomeReceived: number;
  /** Despesas pagas por conta (exclui compras no cartão). */
  registeredExpenses: number;
  /** Pagamentos de cartão — saem de conta, reduzem disponível. */
  creditCardPayments: number;
  /** Compras no cartão — informativo; não reduzem disponível. */
  creditCardPurchases: number;
  goalReserved: number;
  futureObligations: number;
  loanPaymentsPaid: number;
  loanAmortizationsPaid: number;
  financialCharges: number;
};

export type MonthlyAvailableBreakdownInput = {
  incomeReceived: number;
  /** Despesas pagas por conta (exclui credit_card_purchase). */
  registeredExpenses: number;
  creditCardPayments?: number;
  creditCardPurchases?: number;
  goalReserved: number;
  futureObligations: number;
  /** Total já pago em mensalidades de crédito este mês (cash out). */
  loanPaymentsPaid?: number;
  /** Amortizações extra pagas este mês (cash out). */
  loanAmortizationsPaid?: number;
  /** Juros/encargos das mensalidades (informativo; já incluídos em loanPaymentsPaid). */
  financialCharges?: number;
  /** Gastos de consumo totais (conta + cartão) — para análises, não reduz disponível directamente. */
  consumptionSpending?: number;
  referenceDate?: Date;
};

export type MonthlyAvailableBreakdown = {
  available: number;
  dailySafeSpend: number;
  daysRemaining: number;
  monthEndProjection: number;
  /** Gastos de consumo do mês (inclui cartão) — separado do disponível em contas. */
  consumptionSpending: number;
  components: MonthlyAvailableComponents;
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
): MonthlyAvailableBreakdown {
  const reference = input.referenceDate ?? new Date();
  const loanPaymentsPaid = input.loanPaymentsPaid ?? 0;
  const loanAmortizationsPaid = input.loanAmortizationsPaid ?? 0;
  const financialCharges = input.financialCharges ?? 0;
  const creditCardPayments = input.creditCardPayments ?? 0;
  const creditCardPurchases = input.creditCardPurchases ?? 0;

  const components: MonthlyAvailableComponents = {
    incomeReceived: roundMoney(input.incomeReceived),
    registeredExpenses: roundMoney(input.registeredExpenses),
    creditCardPayments: roundMoney(creditCardPayments),
    creditCardPurchases: roundMoney(creditCardPurchases),
    goalReserved: roundMoney(input.goalReserved),
    futureObligations: roundMoney(input.futureObligations),
    loanPaymentsPaid: roundMoney(loanPaymentsPaid),
    loanAmortizationsPaid: roundMoney(loanAmortizationsPaid),
    financialCharges: roundMoney(financialCharges),
  };

  let available = components.incomeReceived;
  available = subtractMoney(available, components.registeredExpenses);
  available = subtractMoney(available, components.creditCardPayments);
  available = subtractMoney(available, components.goalReserved);
  available = subtractMoney(available, components.futureObligations);
  available = subtractMoney(available, components.loanPaymentsPaid);
  available = subtractMoney(available, components.loanAmortizationsPaid);
  available = roundMoney(available);

  const daysRemaining = daysRemainingInMonth(reference);
  const dailySafeSpend = roundMoney(available / daysRemaining);

  const monthEndProjection = roundMoney(
    addMoney(available, subtractMoney(0, components.futureObligations)),
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
    'Disponível este mês = dinheiro nas contas para gastar até ao fim do mês.',
    'Compras no cartão entram nos gastos do mês, mas não reduzem o disponível agora.',
    'Pagamentos de cartão saem de uma conta e reduzem o disponível.',
    'Reservado para objetivos reduz o disponível, mas não é despesa de consumo.',
    'Transferências entre contas não alteram o disponível total.',
    'Amortizações extra reduzem dívida sem contar como consumo.',
  ];

  return {
    available,
    dailySafeSpend,
    daysRemaining,
    monthEndProjection,
    consumptionSpending,
    components,
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
