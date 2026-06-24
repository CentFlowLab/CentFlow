import { isDiagnosticsEnabled } from '@/lib/diagnostics';
import { logDoctorMutationFailure } from '@/lib/doctor';
import { isSupabaseEnabled, getSupabaseClient } from '@/lib/supabase';

import type { LifecycleEmailType } from './types';

export function isEmailDevToolsEnabled(): boolean {
  return isDiagnosticsEnabled() && isSupabaseEnabled();
}

export type TestEmailOptions = {
  /** Se true, só regista em email_events sem enviar via Resend. */
  preview?: boolean;
};

export type TestEmailResult = {
  preview: boolean;
  ok?: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
};

/** Envia email de teste para o utilizador autenticado (dev/beta apenas). */
export async function invokeTestEmail(
  emailType: LifecycleEmailType,
  options: TestEmailOptions = {},
): Promise<TestEmailResult> {
  if (!isEmailDevToolsEnabled()) {
    throw new Error('Ferramentas de email só disponíveis em dev/beta.');
  }

  const preview = options.preview ?? true;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { emailType, preview },
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

  return {
    preview,
    ...(typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {}),
  } as TestEmailResult;
}
