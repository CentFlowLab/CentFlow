import type { EmailUserContext, LifecycleEmailType, SendEmailResult } from './types.ts';
import { buildEmailTemplate } from './templates.ts';
import {
  hasLifecycleEmailToday,
  logEmailEvent,
  sendViaResend,
  wasEmailSentRecently,
} from './provider.ts';
import { canSendByPreferences, isLifecycleEmail } from './utils.ts';

type SupabaseAdmin = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    select: (columns: string) => unknown;
  };
};

export async function dispatchLifecycleEmail(
  supabase: SupabaseAdmin,
  user: EmailUserContext,
  emailType: LifecycleEmailType,
  extras: Record<string, string> = {},
  options: { preview?: boolean; force?: boolean } = {},
): Promise<SendEmailResult> {
  if (!options.force && !canSendByPreferences(emailType, user.preferences)) {
    await logEmailEvent(supabase, {
      user_id: user.userId,
      email_type: emailType,
      status: 'skipped',
      metadata: { reason: 'opt_out' },
    });
    return { ok: true, skipped: true, reason: 'opt_out' };
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  if (!options.force) {
    if (isLifecycleEmail(emailType)) {
      const hasToday = await hasLifecycleEmailToday(supabase, user.userId);
      if (hasToday) {
        await logEmailEvent(supabase, {
          user_id: user.userId,
          email_type: emailType,
          status: 'skipped',
          metadata: { reason: 'lifecycle_daily_cap' },
        });
        return { ok: true, skipped: true, reason: 'lifecycle_daily_cap' };
      }
    }

    const dedupeHours: Partial<Record<LifecycleEmailType, number>> = {
      welcome: 24 * 365,
      onboarding_incomplete: 7 * 24,
      first_step_missing: 14 * 24,
      inactive_7d: 7 * 24,
      inactive_30d: 30 * 24,
      warranty_expiring: 7 * 24,
      subscription_renewal: 7 * 24,
      credit_payment_due: 7 * 24,
      weekly_digest: 6 * 24,
      tips_insight: 7 * 24,
    };

    const hours = dedupeHours[emailType] ?? 24;
    const sinceIso = new Date(now - hours * 60 * 60 * 1000).toISOString();
    const duplicate = await wasEmailSentRecently(supabase, user.userId, emailType, sinceIso);

    if (duplicate) {
      await logEmailEvent(supabase, {
        user_id: user.userId,
        email_type: emailType,
        status: 'skipped',
        metadata: { reason: 'duplicate' },
      });
      return { ok: true, skipped: true, reason: 'duplicate' };
    }
  }

  const template = buildEmailTemplate(emailType, user, extras);

  if (options.preview) {
    await logEmailEvent(supabase, {
      user_id: user.userId,
      email_type: emailType,
      status: 'preview',
      metadata: { subject: template.subject },
    });
    return { ok: true, providerMessageId: 'preview' };
  }

  const sendResult = await sendViaResend({
    to: user.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  if (sendResult.error) {
    await logEmailEvent(supabase, {
      user_id: user.userId,
      email_type: emailType,
      status: 'failed',
      error: sendResult.error,
    });
    return { ok: false, error: sendResult.error };
  }

  await logEmailEvent(supabase, {
    user_id: user.userId,
    email_type: emailType,
    status: 'sent',
    provider_message_id: sendResult.messageId,
    metadata: { subject: template.subject },
  });

  return { ok: true, providerMessageId: sendResult.messageId };
}
