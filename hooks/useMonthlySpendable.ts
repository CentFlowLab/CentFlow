import { useMemo } from 'react';

import { useFinancialState } from '@/hooks/useFinancialState';
import {
  breakdownToSpendableOutput,
  type MonthlyAvailableBreakdown,
  type MonthlyAvailableObligation,
} from '@/lib/domain/financial/monthly-available';
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
  const { state, isLoading } = useFinancialState({ referenceDate });

  return useMemo(() => {
    if (!state) {
      return {
        available: 0,
        dailySafeSpend: 0,
        components: {
          budgetAccountBalance: 0,
          incomeReceived: 0,
          registeredExpenses: 0,
          creditCardPayments: 0,
          creditCardPurchases: 0,
          goalReserved: 0,
          futureObligations: 0,
          loanPaymentsPaid: 0,
          loanAmortizationsPaid: 0,
          financialCharges: 0,
          movedOutOfBudget: 0,
          movedIntoBudget: 0,
          consumptionSpending: 0,
        },
        obligations: [],
        budgetAccountsIncluded: [],
        budgetAccountsExcluded: [],
        daysRemaining: 1,
        monthEndProjection: 0,
        consumptionSpending: 0,
        warnings: [],
        notes: [],
        remainingThisMonth: 0,
        dailyAvailable: 0,
        projectedEndOfMonthBalance: 0,
        futureIncome: 0,
        futureExpense: 0,
        upcomingSubscriptions: [],
        upcomingInstallments: [],
        isLoading,
      };
    }

    const breakdown = state.budget;

    traceMonthlyAvailableBreakdown({
      available: breakdown.available,
      income: breakdown.components.incomeReceived,
      expenses: breakdown.components.registeredExpenses,
      goals: breakdown.components.goalReserved,
      obligations: breakdown.components.futureObligations,
    });

    const legacy = breakdownToSpendableOutput(breakdown);

    const upcomingSubscriptions = breakdown.obligations
      .filter((o: MonthlyAvailableObligation) => o.kind === 'subscription')
      .map(mapObligation);
    const upcomingInstallments = breakdown.obligations
      .filter((o: MonthlyAvailableObligation) => o.kind === 'credit_installment')
      .map(mapObligation);

    return {
      ...breakdown,
      ...legacy,
      futureIncome: 0,
      futureExpense: 0,
      upcomingSubscriptions,
      upcomingInstallments,
      isLoading,
    };
  }, [state, isLoading]);
}

function mapObligation(item: MonthlyAvailableObligation) {
  return {
    id: item.id,
    name: item.name,
    amount: item.amount,
    dueDate: item.dueDate,
  };
}
