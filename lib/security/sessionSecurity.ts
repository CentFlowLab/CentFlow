import { isSupabaseEnabled } from '@/lib/supabase/config';

import { logSecurityError, logSecurityEvent, getSafeSecurityMessage } from './securityLogger';

export type SessionExpiredReason = 'token_invalid' | 'signed_out' | 'refresh_failed';

let sessionExpiredHandler: ((reason: SessionExpiredReason) => void) | null = null;

export function setSessionExpiredHandler(
  handler: ((reason: SessionExpiredReason) => void) | null,
): void {
  sessionExpiredHandler = handler;
}

export function notifySessionExpired(reason: SessionExpiredReason): void {
  logSecurityEvent('session_expired', { reason }, 'warn');
  sessionExpiredHandler?.(reason);
}

export function getSessionExpiredMessage(): string {
  return getSafeSecurityMessage('session_expired');
}

export async function subscribeToAuthSessionChanges(
  onSignedIn: () => void,
  onSignedOut: () => void,
): Promise<(() => void) | null> {
  if (!isSupabaseEnabled()) return null;

  try {
    const { getSupabaseClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseClient();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        onSignedIn();
        return;
      }

      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        onSignedOut();
        return;
      }

      if (event === 'USER_UPDATED') {
        logSecurityEvent('user_updated', undefined, 'info');
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  } catch (error) {
    logSecurityError('auth_session_subscribe_failed', error);
    return null;
  }
}

/** Limpa sessão local de forma segura sem expor detalhes. */
export async function secureLogoutCleanup(): Promise<void> {
  const { clearSession } = await import('@/lib/auth/auth.service');
  await clearSession();
  logSecurityEvent('secure_logout', undefined, 'info');
}
