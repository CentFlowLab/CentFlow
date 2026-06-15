import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { invalidateAssetsQueries } from '@/lib/api/invalidate-queries';
import type { Subscription } from '@/lib/domain/assets.types';
import type { Credit } from '@/lib/domain/types';
import {
  loadLiabilities,
  saveCredits,
  saveSubscriptions,
} from '@/lib/storage/liabilities-storage';
import { useAuth } from '@/lib/auth';

function randomId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useLiabilities() {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: queryKeys.liabilities(userId),
    queryFn: () => loadLiabilities(userId),
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
      const current = await loadLiabilities(userId);
      const credit: Credit = {
        id: input.id ?? randomId('credit'),
        name: input.name,
        outstandingBalance: input.outstandingBalance,
        nextPaymentDate: input.nextPaymentDate,
        nextPaymentAmount: input.nextPaymentAmount,
      };

      const credits = input.id
        ? current.credits.map((item) => (item.id === input.id ? credit : item))
        : [...current.credits, credit];

      await saveCredits(userId, credits);
      return credit;
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
      const current = await loadLiabilities(userId);
      await saveCredits(
        userId,
        current.credits.filter((item) => item.id !== id),
      );
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
      const current = await loadLiabilities(userId);
      const subscription: Subscription = {
        id: input.id ?? randomId('sub'),
        name: input.name,
        amount: input.amount,
        renewsAt: input.renewsAt,
        category: input.category,
        notes: input.notes,
      };

      const subscriptions = input.id
        ? current.subscriptions.map((item) => (item.id === input.id ? subscription : item))
        : [...current.subscriptions, subscription];

      await saveSubscriptions(userId, subscriptions);
      return subscription;
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
      const current = await loadLiabilities(userId);
      await saveSubscriptions(
        userId,
        current.subscriptions.filter((item) => item.id !== id),
      );
    },
    onSuccess: () => {
      invalidateAssetsQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: queryKeys.liabilities(userId) });
    },
  });
}
