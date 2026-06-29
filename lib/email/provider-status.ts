import { isDiagnosticsEnabled } from '@/lib/diagnostics';
import { isSupabaseEnabled, getSupabaseClient } from '@/lib/supabase';

import type { EmailProviderStatus } from './types';

export async function fetchEmailProviderStatus(): Promise<EmailProviderStatus | null> {
  if (!isDiagnosticsEnabled() || !isSupabaseEnabled()) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('send-email', {
    method: 'GET',
  });

  if (error || !data || typeof data !== 'object') {
    return null;
  }

  const row = data as Record<string, unknown>;
  if ('error' in row) {
    return null;
  }

  return {
    resendConfigured: Boolean(row.resendConfigured),
    cronConfigured: Boolean(row.cronConfigured),
    emailFromDomain: String(row.emailFromDomain ?? 'unknown'),
    sandboxMode: Boolean(row.sandboxMode),
  };
}

export function describeEmailProviderStatus(status: EmailProviderStatus | null | undefined): string {
  if (!status) {
    return 'Estado Resend indisponível (function não deployada ou sem sessão).';
  }
  if (!status.resendConfigured) {
    return 'Resend ainda não configurado no servidor (RESEND_API_KEY em falta). Corre npm run email:setup.';
  }
  if (status.sandboxMode) {
    return `Modo teste Resend (@${status.emailFromDomain}) — só envia para o email da tua conta Resend.`;
  }
  return `Resend ativo (@${status.emailFromDomain})${status.cronConfigured ? '' : ' · cron jobs ainda sem secret'}.`;
}
