import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { invalidateAllRemoteData } from '@/lib/api/invalidate-queries';
import { useAuth } from '@/lib/auth';

const FOREGROUND_STALE_THRESHOLD_MS = 30_000;

/**
 * Mantém dados sincronizados entre dispositivos:
 * - Realtime Supabase (INSERT/UPDATE/DELETE) — adiado após arranque
 * - Refetch ao voltar à app (AppState active), com throttle para evitar tempestades
 */
export function RemoteDataSyncEffect() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const lastInactiveAtRef = useRef(Date.now());

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

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        lastInactiveAtRef.current = Date.now();
        return;
      }

      if (state !== 'active') return;

      const inactiveMs = Date.now() - lastInactiveAtRef.current;
      if (inactiveMs >= FOREGROUND_STALE_THRESHOLD_MS) {
        invalidateAllRemoteData(queryClient);
        return;
      }

      void queryClient.refetchQueries({ stale: true, type: 'active' });
    });

    return () => subscription.remove();
  }, [isAuthenticated, queryClient, userId]);

  return null;
}
