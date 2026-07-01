import { useMemo } from 'react';

import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useTransactions } from '@/hooks/queries/useTransactions';
import {
  calculateMonthlySpendable,
  type MonthlySpendableOutput,
} from '@/lib/budget/calculateMonthlySpendable';
import {
  filterFutureForBudgetMonth,
  filterOccurredForBudgetMonth,
  incomeCountsForBudgetMonth,
} from '@/lib/domain/monthly-budget-movements';
import type { Transaction } from '@/lib/domain/transaction.types';

export type UpcomingObligation = {
  id: string;
  name: string;
  amount: number;
  dueDate?: string;
};

export type MonthlySpendable = MonthlySpendableOutput & {
  futureIncome: number;
  futureExpense: number;
  upcomingSubscriptions: UpcomingObligation[];
  upcomingInstallments: UpcomingObligation[];
  isLoading: boolean;
};

/**
 * Liga `calculateMonthlySpendable` aos dados reais (Supabase via TanStack Query).
 * Receitas usam mês financeiro (budget_month); despesas usam mês civil da data.
 */
export function useMonthlySpendable(referenceDate: Date = new Date()): MonthlySpendable {
  const { data: transactions = [], isLoading: txLoading } = useTransactions('all');
  const { data: liabilities, isLoading: liabLoading } = useLiabilities();
  const { data: onboardingAnswers } = useOnboardingAnswers();

  return useMemo(() => {
    const occurredThisMonth = filterOccurredForBudgetMonth(transactions, referenceDate);
    const futureThisMonth = filterFutureForBudgetMonth(transactions, referenceDate);

    const subscriptions = liabilities?.subscriptions ?? [];
    const credits = liabilities?.credits ?? [];

    const subscriptionInputs = subscriptions
      .filter((subscription) => subscription.amount > 0)
      .map((subscription) => ({
        amount: subscription.amount,
        dueDate: subscription.renewsAt,
      }));

    const installmentInputs = credits
      .map((credit) => ({
        amount: credit.nextPaymentAmount ?? credit.monthlyPayment ?? 0,
        dueDate: credit.nextPaymentDate,
      }))
      .filter((installment) => installment.amount > 0);

    const incomeThisMonth = transactions
      .filter((tx) => incomeCountsForBudgetMonth(tx, referenceDate))
      .reduce((sum, tx) => sum + tx.amount, 0);

    /** Orçamento inicial a partir do rendimento declarado no onboarding. */
    const onboardingIncome = onboardingAnswers?.monthlyIncome ?? 0;
    const monthlyBudget =
      onboardingAnswers?.completed &&
      onboardingIncome > 0 &&
      incomeThisMonth <= 0
        ? onboardingIncome
        : undefined;

    const output = calculateMonthlySpendable({
      currentBalance: 0,
      currentMonthMovements: occurredThisMonth,
      futureMovements: futureThisMonth,
      subscriptions: subscriptionInputs,
      creditInstallments: installmentInputs,
      monthlyBudget,
      referenceDate,
    });

    const futureIncome = sumFutureByType(transactions, referenceDate, 'income');
    const futureExpense = sumFutureByType(transactions, referenceDate, 'expense');

    const upcomingSubscriptions: UpcomingObligation[] = subscriptions
      .filter((subscription) => subscription.amount > 0)
      .map((subscription) => ({
        id: subscription.id,
        name: subscription.name,
        amount: subscription.amount,
        dueDate: subscription.renewsAt,
      }));

    const upcomingInstallments: UpcomingObligation[] = credits
      .filter((credit) => (credit.nextPaymentAmount ?? credit.monthlyPayment ?? 0) > 0)
      .map((credit) => ({
        id: credit.id,
        name: credit.name,
        amount: credit.nextPaymentAmount ?? credit.monthlyPayment ?? 0,
        dueDate: credit.nextPaymentDate,
      }));

    return {
      ...output,
      futureIncome,
      futureExpense,
      upcomingSubscriptions,
      upcomingInstallments,
      isLoading: txLoading || liabLoading,
    };
  }, [transactions, liabilities, onboardingAnswers, referenceDate, txLoading, liabLoading]);
}

function sumFutureByType(
  transactions: Transaction[],
  referenceDate: Date,
  type: 'income' | 'expense',
): number {
  const future = filterFutureForBudgetMonth(transactions, referenceDate);
  return future
    .filter((movement) => movement.type === type)
    .reduce((sum, movement) => sum + movement.amount, 0);
}
