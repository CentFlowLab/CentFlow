import { useMemo } from 'react';

import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useTransactions } from '@/hooks/queries/useTransactions';
import {
  calculateMonthlySpendable,
  type MonthlySpendableOutput,
  type SpendableMovement,
} from '@/lib/budget/calculateMonthlySpendable';
import {
  isTransactionFuture,
  isTransactionOccurred,
  parseTransactionDate,
} from '@/lib/domain/transaction-date.utils';
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

function isSameMonth(date: Date, reference: Date): boolean {
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  );
}

function toSpendableMovement(tx: Transaction): SpendableMovement | null {
  if (tx.type === 'transfer') return null;
  return { type: tx.type, amount: tx.amount, date: tx.date };
}

/**
 * Liga `calculateMonthlySpendable` aos dados reais (Supabase via TanStack Query).
 * O orçamento mensal considera apenas movimentos do mês civil actual — sem arrastar
 * défices de meses anteriores para o «Disponível este mês».
 */
export function useMonthlySpendable(referenceDate: Date = new Date()): MonthlySpendable {
  const { data: transactions = [], isLoading: txLoading } = useTransactions('all');
  const { data: liabilities, isLoading: liabLoading } = useLiabilities();
  const { data: onboardingAnswers } = useOnboardingAnswers();

  return useMemo(() => {
    const occurredThisMonth = transactions.filter(
      (tx) =>
        isTransactionOccurred(tx.date, referenceDate) &&
        isSameMonth(parseTransactionDate(tx.date), referenceDate),
    );
    const futureThisMonth = transactions.filter(
      (tx) =>
        isTransactionFuture(tx.date, referenceDate) &&
        isSameMonth(parseTransactionDate(tx.date), referenceDate),
    );

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

    const incomeThisMonth = occurredThisMonth
      .filter((tx) => tx.type === 'income')
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
      currentMonthMovements: occurredThisMonth
        .map(toSpendableMovement)
        .filter((m): m is SpendableMovement => m !== null),
      futureMovements: futureThisMonth
        .map(toSpendableMovement)
        .filter((m): m is SpendableMovement => m !== null),
      subscriptions: subscriptionInputs,
      creditInstallments: installmentInputs,
      monthlyBudget,
      referenceDate,
    });

    const futureIncome = futureThisMonth
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const futureExpense = futureThisMonth
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);

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
