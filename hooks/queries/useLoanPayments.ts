import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { invalidateAssetsQueries } from '@/lib/api/invalidate-queries';
import type { CreateLoanPaymentInput } from '@/lib/supabase/loan-payments';
import { useAuth } from '@/lib/auth';
import { isSupabaseEnabled, supabaseLoanPayments } from '@/lib/supabase';
import {
  advanceCreditPaymentDate,
  calculateDebtAmortizationImpact,
  calculateMonthlyLoanPaymentImpact,
} from '@/lib/domain/financial/loan-payments';
import { saveCreditForUser } from '@/lib/liabilities/liabilities.service';
import type { Credit } from '@/lib/domain/types';
import { traceLoanPayment } from '@/lib/doctor/loan-payment-trace';
import { scheduleFinancialRecalculation } from '@/lib/domain/financial/engine.invalidation';

export function useLoanPayments() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.loanPayments,
    queryFn: () => supabaseLoanPayments.fetchLoanPayments(),
    enabled: isAuthenticated && isSupabaseEnabled(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateLoanPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (input: CreateLoanPaymentInput & { credit: Credit }) => {
      if (!userId) throw new Error('Sessão expirada.');

      traceLoanPayment(
        input.type === 'monthly_payment'
          ? 'loan_monthly_payment_create'
          : 'loan_extra_principal_payment_create',
        { creditId: input.creditId, amount: input.amount },
      );

      const payment = await supabaseLoanPayments.createLoanPayment(input);

      const impact =
        input.type === 'monthly_payment'
          ? calculateMonthlyLoanPaymentImpact({
              credit: input.credit,
              accountId: input.accountId,
              amount: input.amount,
              principalAmount: input.principalAmount,
              interestAmount: input.interestAmount,
              paidAt: input.paidAt,
            })
          : calculateDebtAmortizationImpact({
              credit: input.credit,
              accountId: input.accountId,
              amount: input.amount,
              paidAt: input.paidAt,
            });

      const updatedCredit: Credit = {
        ...input.credit,
        outstandingBalance: impact.newCreditBalance,
        nextPaymentDate:
          input.type === 'monthly_payment'
            ? advanceCreditPaymentDate(input.credit, input.paidAt ?? new Date().toISOString())
            : input.credit.nextPaymentDate,
      };

      await saveCreditForUser(userId, updatedCredit);
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.loanPayments });
      queryClient.invalidateQueries({ queryKey: queryKeys.liabilities(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.home });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
      invalidateAssetsQueries(queryClient);
      scheduleFinancialRecalculation(queryClient, userId, { type: 'loan_payment_created' });
    },
  });
}
