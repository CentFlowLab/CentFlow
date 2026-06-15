import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { invalidateAllRemoteData } from '@/lib/api/invalidate-queries';
import { useAuth } from '@/lib/auth';

/**
 * Mantém dados sincronizados entre dispositivos:
 * - Realtime Supabase (INSERT/UPDATE/DELETE) — adiado após arranque
 * - Refetch ao voltar à app (AppState active)
 */
export function RemoteDataSyncEffect() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    let cancelled = false;
    let unsubscribe = () => {};

    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const { subscribeToUserDataSync } = await import('@/lib/supabase/realtime-sync');
        if (cancelled) return;
        unsubscribe = subscribeToUserDataSync(userId, queryClient);
      } catch (error) {
        if (__DEV__) {
          console.warn('[Sync] Realtime indisponível:', error);
        }
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe();
    };
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
