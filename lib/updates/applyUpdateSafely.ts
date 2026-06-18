import * as Updates from 'expo-updates';

import { logSecurityEvent } from '@/lib/security/securityLogger';

export type ApplyUpdateResult = {
  applied: boolean;
  pendingReload: boolean;
  reason?: string;
};

let criticalActionInProgress = false;

/** Evita aplicar OTA a meio de acções críticas (ex.: guardar movimento). */
export function setCriticalActionInProgress(inProgress: boolean): void {
  criticalActionInProgress = inProgress;
}

export async function applyUpdateSafely(): Promise<ApplyUpdateResult> {
  if (__DEV__ || !Updates.isEnabled) {
    return { applied: false, pendingReload: false, reason: 'updates_disabled' };
  }

  if (criticalActionInProgress) {
    return { applied: false, pendingReload: false, reason: 'critical_action' };
  }

  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) {
      return { applied: false, pendingReload: false, reason: 'no_update' };
    }

    await Updates.fetchUpdateAsync();
    logSecurityEvent('update_fetched', { manifestId: check.manifest?.id });

    if (criticalActionInProgress) {
      return { applied: false, pendingReload: true, reason: 'deferred_reload' };
    }

    await Updates.reloadAsync();
    return { applied: true, pendingReload: false };
  } catch (error) {
    logSecurityEvent(
      'update_apply_failed',
      { message: error instanceof Error ? error.message : 'unknown' },
      'warn',
    );
    return { applied: false, pendingReload: false, reason: 'apply_failed' };
  }
}

export async function reloadIfUpdatePending(): Promise<void> {
  if (__DEV__ || !Updates.isEnabled || criticalActionInProgress) return;

  try {
    const check = await Updates.checkForUpdateAsync();
    if (check.isAvailable) {
      await Updates.fetchUpdateAsync();
      if (!criticalActionInProgress) {
        await Updates.reloadAsync();
      }
    }
  } catch {
    // silencioso — não bloquear utilizador
  }
}
