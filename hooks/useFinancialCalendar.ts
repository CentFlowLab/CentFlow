import { useMemo } from 'react';

import { useAssets } from '@/hooks/queries/useAssets';
import { useGoalContributions } from '@/hooks/queries/useGoalContributions';
import { useLoanPayments } from '@/hooks/queries/useLoanPayments';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { useFinancialState } from '@/hooks/useFinancialState';
import {
  buildFinancialCalendar,
  type FinancialCalendarResult,
} from '@/lib/domain/financial/calendar';
import { captureDomainCalculationError } from '@/lib/sentry';

export type UseFinancialCalendarOptions = {
  horizonDays?: number;
};

export function useFinancialCalendar(
  options: UseFinancialCalendarOptions = {},
): {
  calendar: FinancialCalendarResult | null;
  isLoading: boolean;
} {
  const horizonDays = options.horizonDays ?? 30;
  const { state, isLoading: stateLoading } = useFinancialState();
  const { data: transactions = [], isLoading: txLoading } = useTransactions('all');
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: liabilities, isLoading: liabLoading } = useLiabilities();
  const { data: goalContributions = [], isLoading: goalsLoading } = useGoalContributions();
  const { data: loanPayments = [], isLoading: loanLoading } = useLoanPayments();
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences();

  const isLoading =
    stateLoading || txLoading || assetsLoading || liabLoading || goalsLoading || loanLoading || prefsLoading;

  const calendar = useMemo(() => {
    if (isLoading || !state) return null;

    try {
      return buildFinancialCalendar(state, horizonDays, {
        transactions,
        subscriptions: liabilities?.subscriptions ?? assets?.subscriptions ?? [],
        credits: liabilities?.credits ?? assets?.credits ?? [],
        goalContributions,
        loanPayments,
        prioritizeDebtAmortization: preferences?.prioritizeDebtAmortization ?? true,
        asOf: state.asOf,
      });
    } catch (error) {
      captureDomainCalculationError('financial_calendar', error, { horizonDays });
      return null;
    }
  }, [
    assets,
    goalContributions,
    horizonDays,
    isLoading,
    liabilities,
    loanPayments,
    preferences?.prioritizeDebtAmortization,
    state,
    transactions,
  ]);

  return { calendar, isLoading };
}
