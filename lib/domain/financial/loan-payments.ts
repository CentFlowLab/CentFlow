import type { Credit } from '@/lib/domain/types';

import { addMoney, roundMoney, subtractMoney } from './money';

export type LoanPaymentType = 'monthly_payment' | 'extra_principal_payment';

export type LoanPaymentRecord = {
  id: string;
  creditId: string;
  accountId?: string | null;
  type: LoanPaymentType;
  amount: number;
  principalAmount?: number | null;
  interestAmount?: number | null;
  feesAmount?: number | null;
  paidAt: string;
  note?: string | null;
};

export type LoanMonthlyPaymentInput = {
  credit: Pick<Credit, 'id' | 'outstandingBalance' | 'nextPaymentDate'>;
  accountId: string;
  amount: number;
  principalAmount?: number;
  interestAmount?: number;
  paidAt?: string;
};

export type LoanAmortizationInput = {
  credit: Pick<Credit, 'id' | 'outstandingBalance'>;
  accountId: string;
  amount: number;
  paidAt?: string;
};

export function calculateLoanPaymentBreakdown(input: {
  amount: number;
  principalAmount?: number;
  interestAmount?: number;
}): {
  principal: number;
  interest: number;
  fees: number;
  total: number;
} {
  const total = roundMoney(input.amount);
  const interest = roundMoney(input.interestAmount ?? 0);
  let principal = roundMoney(input.principalAmount ?? subtractMoney(total, interest));
  if (principal < 0) principal = 0;
  if (principal + interest > total) {
    principal = roundMoney(Math.max(0, subtractMoney(total, interest)));
  }
  return {
    principal,
    interest,
    fees: roundMoney(Math.max(0, subtractMoney(total, addMoney(principal, interest)))),
    total,
  };
}

export function calculateDebtAmortizationImpact(input: LoanAmortizationInput): {
  newCreditBalance: number;
  accountDelta: number;
  availableDelta: number;
} {
  const amount = roundMoney(input.amount);
  return {
    newCreditBalance: roundMoney(Math.max(0, subtractMoney(input.credit.outstandingBalance, amount))),
    accountDelta: -amount,
    availableDelta: -amount,
  };
}

export function calculateMonthlyLoanPaymentImpact(
  input: LoanMonthlyPaymentInput,
): {
  newCreditBalance: number;
  accountDelta: number;
  availableDelta: number;
  financialExpenseDelta: number;
  principalReduced: number;
} {
  const breakdown = calculateLoanPaymentBreakdown({
    amount: input.amount,
    principalAmount: input.principalAmount,
    interestAmount: input.interestAmount,
  });
  const principalReduced = roundMoney(
    Math.min(breakdown.principal, input.credit.outstandingBalance),
  );

  return {
    newCreditBalance: roundMoney(
      Math.max(0, subtractMoney(input.credit.outstandingBalance, principalReduced)),
    ),
    accountDelta: -breakdown.total,
    availableDelta: -breakdown.total,
    financialExpenseDelta: breakdown.interest,
    principalReduced,
  };
}

export function sumLoanPaymentsInMonth(
  payments: LoanPaymentRecord[],
  monthKey: string,
): {
  monthlyTotal: number;
  amortizationTotal: number;
  interestTotal: number;
  paidCreditIds: Set<string>;
} {
  let monthlyTotal = 0;
  let amortizationTotal = 0;
  let interestTotal = 0;
  const paidCreditIds = new Set<string>();

  for (const payment of payments) {
    if (!payment.paidAt.startsWith(monthKey)) continue;
    if (payment.type === 'monthly_payment') {
      monthlyTotal = addMoney(monthlyTotal, payment.amount);
      interestTotal = addMoney(interestTotal, payment.interestAmount ?? 0);
      paidCreditIds.add(payment.creditId);
    } else {
      amortizationTotal = addMoney(amortizationTotal, payment.amount);
      paidCreditIds.add(payment.creditId);
    }
  }

  return {
    monthlyTotal: roundMoney(monthlyTotal),
    amortizationTotal: roundMoney(amortizationTotal),
    interestTotal: roundMoney(interestTotal),
    paidCreditIds,
  };
}

export function advanceCreditPaymentDate(
  credit: Pick<Credit, 'nextPaymentDate'>,
  paidAt: string,
): string | undefined {
  if (!credit.nextPaymentDate) return undefined;
  const paid = new Date(`${paidAt.slice(0, 10)}T12:00:00`);
  const next = new Date(`${credit.nextPaymentDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(paid.getTime()) || Number.isNaN(next.getTime())) return credit.nextPaymentDate;
  if (paid < next) return credit.nextPaymentDate;
  const advanced = new Date(next);
  advanced.setMonth(advanced.getMonth() + 1);
  return advanced.toISOString().slice(0, 10);
}
