import type { Subscription } from '@/lib/domain/assets.types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { Credit } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';
import { getMonthKey } from '@/lib/domain/financial/dates';
import { calculateNetSpending, getIncomeTotalFromLedger } from '@/lib/domain/financial/ledger-impact';
import type { LoanPaymentRecord } from '@/lib/domain/financial/loan-payments';
import { sumLoanPaymentsInMonth } from '@/lib/domain/financial/loan-payments';
import {
  calculateMonthlyAvailableBreakdown,
  type MonthlyAvailableObligation,
} from '@/lib/domain/financial/monthly-available';
import { filterOccurredInCalendarMonth } from '@/lib/domain/financial/transactions';
import { incomeCountsForBudgetMonth } from '@/lib/domain/monthly-budget-movements';
import { isCardCredit } from '@/lib/credit/credit-type.utils';
import { collectPaidSubscriptionIds } from '@/lib/domain/financial/subscription-payments';

function isDueThisMonth(dueDate: string | undefined, monthKey: string, asOf: Date): boolean {
  if (!dueDate) return true;
  if (!dueDate.startsWith(monthKey)) return false;
  const due = new Date(`${dueDate.slice(0, 10)}T12:00:00`);
  const start = new Date(asOf);
  start.setHours(0, 0, 0, 0);
  return due.getTime() >= start.getTime();
}

export type BuildMonthlyAvailableInput = {
  transactions: Transaction[];
  goalContributions: GoalContribution[];
  credits: Credit[];
  subscriptions: Subscription[];
  loanPayments: LoanPaymentRecord[];
  referenceDate?: Date;
};

export function buildMonthlyAvailableBreakdown(input: BuildMonthlyAvailableInput) {
  const reference = input.referenceDate ?? new Date();
  const monthKey = getMonthKey(reference);
  const period = { kind: 'month' as const, monthKey, asOf: reference };

  const occurred = filterOccurredInCalendarMonth(input.transactions, reference);

  const incomeReceived = getIncomeTotalFromLedger(occurred, period);
  const registeredExpenses = calculateNetSpending(occurred, period);

  const goalReserved = input.goalContributions
    .filter((row) => (row.kind ?? 'contribution') === 'contribution')
    .filter((row) => row.createdAt.startsWith(monthKey))
    .reduce((sum, row) => sum + row.amount, 0);

  const { monthlyTotal, amortizationTotal, interestTotal, paidCreditIds } =
    sumLoanPaymentsInMonth(input.loanPayments, monthKey);

  const paidSubscriptionIds = collectPaidSubscriptionIds(
    input.subscriptions,
    occurred,
    reference,
  );

  const obligations: MonthlyAvailableObligation[] = [];

  for (const subscription of input.subscriptions) {
    if (subscription.amount <= 0) continue;
    if (paidSubscriptionIds.has(subscription.id)) continue;
    if (!isDueThisMonth(subscription.renewsAt, monthKey, reference)) continue;
    obligations.push({
      id: subscription.id,
      name: subscription.name,
      amount: subscription.amount,
      dueDate: subscription.renewsAt,
      kind: 'subscription',
    });
  }

  for (const credit of input.credits) {
    if (isCardCredit(credit.creditType)) continue;
    if (paidCreditIds.has(credit.id)) continue;
    const amount = credit.nextPaymentAmount ?? credit.monthlyPayment ?? 0;
    if (amount <= 0) continue;
    if (!isDueThisMonth(credit.nextPaymentDate, monthKey, reference)) continue;
    obligations.push({
      id: credit.id,
      name: credit.name,
      amount,
      dueDate: credit.nextPaymentDate,
      kind: 'credit_installment',
    });
  }

  const futureObligations = obligations.reduce((sum, item) => sum + item.amount, 0);

  return calculateMonthlyAvailableBreakdown(
    {
      incomeReceived,
      registeredExpenses,
      goalReserved,
      futureObligations,
      loanPaymentsPaid: monthlyTotal,
      loanAmortizationsPaid: amortizationTotal,
      financialCharges: interestTotal,
      referenceDate: reference,
    },
    obligations,
  );
}

export function sumIncomeReceived(
  transactions: Transaction[],
  referenceDate: Date,
): number {
  return transactions
    .filter((tx) => incomeCountsForBudgetMonth(tx, referenceDate))
    .reduce((sum, tx) => sum + tx.amount, 0);
}
