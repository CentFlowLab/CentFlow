import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PaymentMethodSelection } from '@/components/accounts/PaymentMethodPickerField';
import { paymentSelectionToFields } from '@/components/accounts/PaymentMethodPickerField';
import { invalidateTransactionQueries } from '@/lib/api/invalidate-queries';
import { queryKeys } from '@/lib/api/keys';
import { createTransaction, fetchTransactions } from '@/lib/api/services/transaction.service';
import { useAuth } from '@/lib/auth';
import { traceRecurringPayment } from '@/lib/doctor/recurring-payment-trace';
import type { Subscription } from '@/lib/domain/assets.types';
import {
  advanceSubscriptionRenewalDate,
  isSubscriptionPaidInCycle,
} from '@/lib/domain/financial/subscription-payments';
import { saveSubscriptionForUser } from '@/lib/liabilities/liabilities.service';

export type MarkSubscriptionPaidInput = {
  subscription: Subscription;
  amount: number;
  date: string;
  paymentMethod: PaymentMethodSelection;
  note?: string;
};

export function useMarkSubscriptionPaid() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (input: MarkSubscriptionPaidInput) => {
      if (!userId) throw new Error('Sessão expirada.');
      if (!input.paymentMethod) throw new Error('Escolhe como pagaste.');

      traceRecurringPayment('recurring_payment_mark_paid', {
        subscriptionId: input.subscription.id,
        amount: input.amount,
      });

      const existing = await fetchTransactions('all');
      if (isSubscriptionPaidInCycle(input.subscription, existing)) {
        throw new Error('Esta despesa recorrente já está paga neste ciclo.');
      }

      const { accountId, creditId } = paymentSelectionToFields(input.paymentMethod);
      const txType = input.paymentMethod.kind === 'card' ? 'credit_card_purchase' : 'expense';

      traceRecurringPayment('recurring_payment_validation', {
        subscriptionId: input.subscription.id,
        accountId,
        creditId,
        type: txType,
      });

      const outcome = await createTransaction({
        type: txType,
        amount: input.amount,
        category: input.subscription.category ?? 'subscriptions',
        description: input.note?.trim() || input.subscription.name,
        date: input.date,
        accountId: accountId ?? undefined,
        creditId: creditId ?? undefined,
        recurringId: input.subscription.id,
      });

      const updated: Subscription = {
        ...input.subscription,
        renewsAt: advanceSubscriptionRenewalDate(input.subscription, input.date),
      };

      await saveSubscriptionForUser(userId, updated);

      traceRecurringPayment('recurring_payment_done', {
        subscriptionId: input.subscription.id,
        transactionId: outcome.transaction.id,
        nextRenewal: updated.renewsAt,
      });

      return { transaction: outcome.transaction, subscription: updated };
    },
    onSuccess: () => {
      invalidateTransactionQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
    },
    onError: (error, input) => {
      traceRecurringPayment(
        'recurring_payment_error',
        { subscriptionId: input.subscription.id, message: String(error) },
        'error',
      );
    },
  });
}
