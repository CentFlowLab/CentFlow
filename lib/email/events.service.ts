import { getSupabaseClient, isSupabaseEnabled } from '@/lib/supabase';

import type { EmailEventStatus } from './types';

export type EmailEventRow = {
  id: string;
  emailType: string;
  status: EmailEventStatus;
  sentAt: string;
  error: string | null;
};

const EMAIL_EVENTS_LIMIT = 20;

export async function fetchEmailEvents(userId: string): Promise<EmailEventRow[]> {
  if (!isSupabaseEnabled()) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('email_events')
    .select('id, email_type, status, sent_at, error')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(EMAIL_EVENTS_LIMIT);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    emailType: row.email_type,
    status: row.status as EmailEventStatus,
    sentAt: row.sent_at,
    error: row.error,
  }));
}
