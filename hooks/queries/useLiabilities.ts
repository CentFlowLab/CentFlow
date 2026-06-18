import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { invalidateAssetsQueries } from '@/lib/api/invalidate-queries';
import type { Subscription } from '@/lib/domain/assets.types';
import type { Credit } from '@/lib/domain/types';
import {
  deleteCreditForUser,
  deleteSubscriptionForUser,
  fetchLiabilitiesForUser,
  saveCreditForUser,
  saveSubscriptionForUser,
} from '@/lib/liabilities/liabilities.service';
import { useAuth } from '@/lib/auth';

function randomId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useLiabilities() {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: queryKeys.liabilities(userId),
    queryFn: () => fetchLiabilitiesForUser(userId),
    enabled: isAuthenticated && Boolean(userId),
    staleTime: 1000 * 60,
  });
}

export function useSaveCredit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (input: Omit<Credit, 'id'> & { id?: string }) => {
      const credit: Credit = {
        id: input.id ?? randomId('credit'),
        name: input.name,
        outstandingBalance: input.outstandingBalance,
        nextPaymentDate: input.nextPaymentDate,
        nextPaymentAmount: input.nextPaymentAmount,
        originalAmount: input.originalAmount,
        interestRateAnnual: input.interestRateAnnual,
        indexRate: input.indexRate,
        spread: input.spread,
        termMonths: input.termMonths,
        monthlyPayment: input.monthlyPayment,
        insuranceMonthly: input.insuranceMonthly,
        creditType: input.creditType,
        lender: input.lender,
        startDate: input.startDate,
        monthlyIncome: input.monthlyIncome,
        notes: input.notes,
      };

      return saveCreditForUser(userId, credit);
    },
    onSuccess: () => {
      invalidateAssetsQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: queryKeys.liabilities(userId) });
    },
  });
}

export function useDeleteCredit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteCreditForUser(userId, id);
    },
    onSuccess: () => {
      invalidateAssetsQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: queryKeys.liabilities(userId) });
    },
  });
}

export function useSaveSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (input: Omit<Subscription, 'id'> & { id?: string }) => {
      if (!userId) {
        throw new Error('Sessão expirada. Inicia sessão novamente.');
      }

      const subscription: Subscription = {
        id: input.id ?? randomId('sub'),
        name: input.name,
        amount: input.amount,
        billingInterval: input.billingInterval ?? 'monthly',
        renewsAt: input.renewsAt,
        category: input.category,
        notes: input.notes,
      };

      return saveSubscriptionForUser(userId, subscription);
    },
    onSuccess: () => {
      invalidateAssetsQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: queryKeys.liabilities(userId) });
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteSubscriptionForUser(userId, id);
    },
    onSuccess: () => {
      invalidateAssetsQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: queryKeys.liabilities(userId) });
    },
  });
}
