import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { invalidateAssetsQueries } from '@/lib/api/invalidate-queries';
import type { Subscription } from '@/lib/domain/assets.types';
import { saveSubscriptionForUser } from '@/lib/liabilities/liabilities.service';
import { useAuth } from '@/lib/auth';
import { logDoctorMutationFailure } from '@/lib/doctor';

export function useMarkSubscriptionReviewed() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (subscription: Subscription) => {
      if (!userId) {
        throw new Error('Sessão expirada. Inicia sessão novamente.');
      }

      const updated: Subscription = {
        ...subscription,
        lastReviewedAt: new Date().toISOString(),
      };

      return saveSubscriptionForUser(userId, updated);
    },
    onSuccess: () => {
      invalidateAssetsQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: queryKeys.liabilities(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
    },
    onError: (error, subscription) => {
      logDoctorMutationFailure(error, {
        action: 'subscription_review',
        screen: 'SubscriptionsSection',
        authenticated: Boolean(userId),
        payload: { id: subscription.id, name: subscription.name },
      });
    },
  });
}
