import { useMemo } from 'react';

import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { useGoalContributions } from '@/hooks/queries/useGoalContributions';
import { useLoanPayments } from '@/hooks/queries/useLoanPayments';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useTransactions } from '@/hooks/queries/useTransactions';
import {
  breakdownToSpendableOutput,
  type MonthlyAvailableBreakdown,
} from '@/lib/domain/financial/monthly-available';
import { buildMonthlyAvailableBreakdown } from '@/lib/domain/financial/monthly-available.compose';
import type { MonthlyAvailableObligation } from '@/lib/domain/financial/monthly-available';
import { traceMonthlyAvailableBreakdown } from '@/lib/doctor/loan-payment-trace';

export type MonthlySpendable = MonthlyAvailableBreakdown & {
  /** @deprecated usar `available` */
  remainingThisMonth: number;
  /** @deprecated usar `dailySafeSpend` */
  dailyAvailable: number;
  projectedEndOfMonthBalance: number;
  futureIncome: number;
  futureExpense: number;
  upcomingSubscriptions: Array<{ id: string; name: string; amount: number; dueDate?: string }>;
  upcomingInstallments: Array<{ id: string; name: string; amount: number; dueDate?: string }>;
  isLoading: boolean;
};

export function useMonthlySpendable(referenceDate: Date = new Date()): MonthlySpendable {
  const { data: transactions = [], isLoading: txLoading } = useTransactions('all');
  const { data: accounts = [], isLoading: accountsLoading } = useAccountsWithBalances();
  const { data: liabilities, isLoading: liabLoading } = useLiabilities();
  const { data: goalContributions = [], isLoading: goalsLoading } = useGoalContributions();
  const { data: loanPayments = [], isLoading: loanLoading } = useLoanPayments();

  return useMemo(() => {
    const breakdown = buildMonthlyAvailableBreakdown({
      accounts,
      transactions,
      goalContributions,
      credits: liabilities?.credits ?? [],
      subscriptions: liabilities?.subscriptions ?? [],
      loanPayments,
      referenceDate,
    });

    traceMonthlyAvailableBreakdown({
      available: breakdown.available,
      income: breakdown.components.incomeReceived,
      expenses: breakdown.components.registeredExpenses,
      goals: breakdown.components.goalReserved,
      obligations: breakdown.components.futureObligations,
    });

    const legacy = breakdownToSpendableOutput(breakdown);

    const upcomingSubscriptions = breakdown.obligations
      .filter((o) => o.kind === 'subscription')
      .map(mapObligation);
    const upcomingInstallments = breakdown.obligations
      .filter((o) => o.kind === 'credit_installment')
      .map(mapObligation);

    return {
      ...breakdown,
      ...legacy,
      futureIncome: 0,
      futureExpense: 0,
      upcomingSubscriptions,
      upcomingInstallments,
      isLoading: txLoading || accountsLoading || liabLoading || goalsLoading || loanLoading,
    };
  }, [
    transactions,
    liabilities,
    goalContributions,
    loanPayments,
    accounts,
    referenceDate,
    txLoading,
    accountsLoading,
    liabLoading,
    goalsLoading,
    loanLoading,
  ]);
}

function mapObligation(item: MonthlyAvailableObligation) {
  return {
    id: item.id,
    name: item.name,
    amount: item.amount,
    dueDate: item.dueDate,
  };
}
