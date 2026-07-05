import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { useAssets } from '@/hooks/queries/useAssets';
import { useCreateGoalContribution } from '@/hooks/queries/useGoalContributions';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import {
  buildSavingsAllocationAction,
  type SavingsAllocationAction,
} from '@/lib/domain/financial/savings-allocation';
import { calculateRealSavingsMargin } from '@/lib/domain/financial/savings-margin';
import { validateGoalContribution } from '@/lib/domain/financial/goals';
import { useMonthlySpendable } from '@/hooks/useMonthlySpendable';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatCurrency } from '@/lib/utils/format';

export function useSavingsAllocationAction(options?: { onSuccess?: () => void }) {
  const spendable = useMonthlySpendable();
  const { data: assets } = useAssets();
  const { data: accounts = [] } = useAccountsWithBalances();
  const { data: transactions = [] } = useTransactions('all');
  const { data: preferences } = useUserPreferences();
  const { data: liabilities } = useLiabilities();
  const contribute = useCreateGoalContribution();

  const margin = useMemo(
    () => calculateRealSavingsMargin(spendable.available, transactions),
    [spendable.available, transactions],
  );

  const action = useMemo(() => {
    if (preferences?.prioritizeDebtAmortization && (liabilities?.credits ?? []).some((c) => c.outstandingBalance > 0)) {
      return null;
    }
    return buildSavingsAllocationAction({
      margin,
      goals: assets?.goals ?? [],
      accounts,
    });
  }, [
    margin,
    assets?.goals,
    accounts,
    preferences?.prioritizeDebtAmortization,
    liabilities?.credits,
  ]);

  const executeAllocation = useCallback(
    async (allocation: SavingsAllocationAction) => {
      const account = accounts.find((item) => item.id === allocation.accountId);
      const accountBalance = account?.balance ?? account?.initialBalance ?? 0;
      const validation = validateGoalContribution({
        amount: allocation.amount,
        accountBalance,
      });
      if (!validation.ok) {
        throw new Error(validation.reason);
      }

      await contribute.mutateAsync({
        goalId: allocation.goalId,
        accountId: allocation.accountId,
        amount: allocation.amount,
        note: 'Alocação sugerida CentFlow',
      });
      options?.onSuccess?.();
    },
    [accounts, contribute, options?.onSuccess],
  );

  const confirmAndAllocate = useCallback(
    (allocation: SavingsAllocationAction) => {
      Alert.alert(
        'Alocar ao objetivo',
        `Transferir ${formatCurrency(allocation.amount)} de ${allocation.accountName} para «${allocation.goalName}»?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Alocar',
            onPress: () => {
              void executeAllocation(allocation)
                .catch((error) => {
                  Alert.alert(
                    'Não foi possível alocar',
                    getApiErrorMessage(error, 'a alocação'),
                  );
                });
            },
          },
        ],
      );
    },
    [executeAllocation],
  );

  return {
    action,
    margin,
    confirmAndAllocate,
    executeAllocation,
    isPending: contribute.isPending,
  };
}
