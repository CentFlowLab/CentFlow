import { getSupabaseClient, isSupabaseEnabled } from '@/lib/supabase';

import type { LifecycleEmailType } from './types';

/** Dispara email lifecycle sem bloquear o fluxo da app (fire-and-forget). */
export function triggerLifecycleEmail(
  emailType: LifecycleEmailType,
  options: { preview?: boolean } = {},
): void {
  if (!isSupabaseEnabled()) return;

  const supabase = getSupabaseClient();
  void supabase.functions
    .invoke('send-email', {
      body: { emailType, preview: options.preview ?? false },
    })
    .catch(() => {
      // Não bloquear registo/login por falha de email.
    });
}

export function triggerWelcomeEmail(): void {
  triggerLifecycleEmail('welcome');
}
