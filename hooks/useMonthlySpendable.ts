import { useMemo } from 'react';

import { useLiabilities } from '@/hooks/queries/useLiabilities';
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
  sumTransactionCashBalance,
  transactionCashDelta,
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

function toSpendableMovement(tx: Transaction): SpendableMovement {
  return { type: tx.type, amount: tx.amount, date: tx.date };
}

/**
 * Liga `calculateMonthlySpendable` aos dados reais (Supabase via TanStack Query).
 * O saldo actual é tratado como saldo de início de mês para evitar dupla contagem
 * com os movimentos já ocorridos este mês.
 */
export function useMonthlySpendable(referenceDate: Date = new Date()): MonthlySpendable {
  const { data: transactions = [], isLoading: txLoading } = useTransactions('all');
  const { data: liabilities, isLoading: liabLoading } = useLiabilities();

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

    const allOccurredNet = sumTransactionCashBalance(transactions, 'occurred', referenceDate);
    const occurredThisMonthNet = occurredThisMonth.reduce(
      (sum, tx) => sum + transactionCashDelta(tx),
      0,
    );
    const startOfMonthBalance = allOccurredNet - occurredThisMonthNet;

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

    const output = calculateMonthlySpendable({
      currentBalance: startOfMonthBalance,
      currentMonthMovements: occurredThisMonth.map(toSpendableMovement),
      futureMovements: futureThisMonth.map(toSpendableMovement),
      subscriptions: subscriptionInputs,
      creditInstallments: installmentInputs,
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
  }, [transactions, liabilities, referenceDate, txLoading, liabLoading]);
}
