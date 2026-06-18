import { isDiagnosticsEnabled } from '@/lib/diagnostics';
import { logDoctorMutationFailure } from '@/lib/doctor';
import { isSupabaseEnabled, getSupabaseClient } from '@/lib/supabase';

import type { LifecycleEmailType } from './types';

export function isEmailDevToolsEnabled(): boolean {
  return isDiagnosticsEnabled() && isSupabaseEnabled();
}

/** Envia email de teste para o utilizador autenticado (dev/beta apenas). */
export async function invokeTestEmail(emailType: LifecycleEmailType): Promise<void> {
  if (!isEmailDevToolsEnabled()) {
    throw new Error('Ferramentas de email só disponíveis em dev/beta.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { emailType, preview: true },
  });

  if (error) {
    logDoctorMutationFailure(error, {
      action: 'email_test_send',
      screen: 'diagnostics',
      payload: { emailType },
    });
    throw error;
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }
}
