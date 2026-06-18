import type { LifecycleEmailType } from './types.ts';

type ResendResponse = {
  id?: string;
  error?: { message?: string };
};

export async function sendViaResend(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ messageId?: string; error?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM') ?? 'CentFlow <onboarding@resend.dev>';

  if (!apiKey) {
    return { error: 'RESEND_API_KEY não configurada' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  const data = (await response.json()) as ResendResponse;

  if (!response.ok) {
    return { error: data.error?.message ?? `Resend HTTP ${response.status}` };
  }

  return { messageId: data.id };
}

export async function logEmailEvent(
  supabase: {
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };
  },
  row: {
    user_id: string;
    email_type: LifecycleEmailType;
    status: 'sent' | 'failed' | 'skipped' | 'preview';
    provider_message_id?: string;
    metadata?: Record<string, unknown>;
    error?: string;
  },
): Promise<void> {
  await supabase.from('email_events').insert({
    user_id: row.user_id,
    email_type: row.email_type,
    status: row.status,
    provider_message_id: row.provider_message_id ?? null,
    metadata: row.metadata ?? {},
    error: row.error ?? null,
  });
}

export async function wasEmailSentRecently(
  supabase: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (col: string, val: string) => {
          eq: (col2: string, val2: string) => {
            gte: (col3: string, val3: string) => {
              limit: (n: number) => Promise<{ data: unknown[] | null }>;
            };
          };
        };
      };
    };
  },
  userId: string,
  emailType: LifecycleEmailType,
  sinceIso: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('email_events')
    .select('id')
    .eq('user_id', userId)
    .eq('email_type', emailType)
    .gte('sent_at', sinceIso)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

export async function hasLifecycleEmailToday(
  supabase: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (col: string, val: string) => {
          in: (col2: string, vals: string[]) => {
            gte: (col3: string, val3: string) => {
              limit: (n: number) => Promise<{ data: unknown[] | null }>;
            };
          };
        };
      };
    };
  },
  userId: string,
): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const lifecycleTypes = [
    'onboarding_incomplete',
    'first_step_missing',
    'inactive_7d',
    'inactive_30d',
  ];

  const { data } = await supabase
    .from('email_events')
    .select('id')
    .eq('user_id', userId)
    .in('email_type', lifecycleTypes)
    .gte('sent_at', startOfDay.toISOString())
    .limit(1);

  return (data?.length ?? 0) > 0;
}
