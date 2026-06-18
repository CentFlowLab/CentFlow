import * as Updates from 'expo-updates';

import { logSecurityEvent } from '@/lib/security/securityLogger';

export type UpdateCheckResult = {
  checked: boolean;
  isAvailable: boolean;
  manifestId?: string;
  reason?: string;
};

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  if (__DEV__ || !Updates.isEnabled) {
    return { checked: false, isAvailable: false, reason: 'updates_disabled' };
  }

  try {
    const result = await Updates.checkForUpdateAsync();
    logSecurityEvent('update_check', {
      isAvailable: result.isAvailable,
      manifestId: result.manifest?.id,
    });

    return {
      checked: true,
      isAvailable: result.isAvailable,
      manifestId: result.manifest?.id,
    };
  } catch (error) {
    logSecurityEvent(
      'update_check_failed',
      { message: error instanceof Error ? error.message : 'unknown' },
      'warn',
    );
    return { checked: false, isAvailable: false, reason: 'check_failed' };
  }
}
