import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/lib/auth';
import {
  invalidateAllRemoteData,
  subscribeToUserDataSync,
} from '@/lib/supabase/realtime-sync';

/**
 * Mantém dados sincronizados entre dispositivos:
 * - Realtime Supabase (INSERT/UPDATE/DELETE)
 * - Refetch ao voltar à app (AppState active)
 */
export function RemoteDataSyncEffect() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const unsubscribe = subscribeToUserDataSync(userId, queryClient);
    return unsubscribe;
  }, [isAuthenticated, queryClient, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        invalidateAllRemoteData(queryClient);
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated, queryClient, userId]);

  return null;
}
