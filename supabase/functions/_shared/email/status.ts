import type { EmailProviderStatus } from './types.ts';

export function getEmailProviderStatus(): EmailProviderStatus {
  const emailFrom = Deno.env.get('EMAIL_FROM') ?? 'CentFlow <noreply@centflow.app>';
  const domainMatch = emailFrom.match(/<[^@]+@([^>]+)>/);
  const domain = domainMatch?.[1] ?? emailFrom.split('@').pop() ?? 'unknown';

  return {
    resendConfigured: Boolean(Deno.env.get('RESEND_API_KEY')),
    cronConfigured: Boolean(Deno.env.get('EMAIL_CRON_SECRET')),
    emailFromDomain: domain,
    sandboxMode: domain.endsWith('resend.dev'),
  };
}
