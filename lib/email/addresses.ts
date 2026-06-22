/**
 * Endereços de email CentFlow (produção).
 * Auth: Supabase Auth (reset, verificação, alteração de email).
 * Lifecycle: Resend via Edge Functions (send-email, email-jobs).
 */
export const CENTFLOW_EMAIL_ADDRESSES = {
  noreply: 'noreply@centflow.app',
  support: 'support@centflow.app',
  auth: 'auth@centflow.app',
  billing: 'billing@centflow.app',
} as const;

export type CentflowEmailRole = keyof typeof CENTFLOW_EMAIL_ADDRESSES;
