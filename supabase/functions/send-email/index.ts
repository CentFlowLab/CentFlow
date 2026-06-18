import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { dispatchLifecycleEmail } from '../_shared/email/dispatch.ts';
import type { EmailUserContext, LifecycleEmailType } from '../_shared/email/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function loadUserContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<EmailUserContext | null> {
  const { data: authData } = await supabase.auth.admin.getUserById(userId);
  const authUser = authData.user;
  if (!authUser?.email) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .maybeSingle();

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select(
      'email_important, email_weekly_digest, email_warranty_alerts, email_subscription_renewals, email_credit_payments, email_tips_insights',
    )
    .eq('user_id', userId)
    .maybeSingle();

  const { data: onboarding } = await supabase
    .from('onboarding_answers')
    .select('completed, answers')
    .eq('user_id', userId)
    .maybeSingle();

  const answers = (onboarding?.answers ?? {}) as Record<string, unknown>;

  return {
    userId,
    email: authUser.email,
    name: profile?.name ?? 'Utilizador',
    primaryObjective: (answers.primaryObjective as string | null) ?? null,
    onboardingCompleted: onboarding?.completed ?? false,
    preferences: {
      email_important: prefs?.email_important ?? true,
      email_weekly_digest: prefs?.email_weekly_digest ?? true,
      email_warranty_alerts: prefs?.email_warranty_alerts ?? true,
      email_subscription_renewals: prefs?.email_subscription_renewals ?? true,
      email_credit_payments: prefs?.email_credit_payments ?? true,
      email_tips_insights: prefs?.email_tips_insights ?? true,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const cronSecret = Deno.env.get('EMAIL_CRON_SECRET');
  const authHeader = req.headers.get('Authorization') ?? '';
  const cronHeader = req.headers.get('x-cron-secret') ?? '';

  const isService = serviceKey && authHeader === `Bearer ${serviceKey}`;
  const isCron = cronSecret && cronHeader === cronSecret;

  if (!isService && !isCron) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const emailType = body.emailType as LifecycleEmailType;
    const preview = Boolean(body.preview);

    if (!emailType) {
      return json({ error: 'emailType required' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey!);
    const context = await loadUserContext(admin, userData.user.id);
    if (!context) return json({ error: 'User context not found' }, 404);

    const result = await dispatchLifecycleEmail(admin, context, emailType, {}, { preview });
    return json(result);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const body = await req.json().catch(() => ({}));
  const userId = body.userId as string | undefined;
  const emailType = body.emailType as LifecycleEmailType | undefined;
  const extras = (body.extras ?? {}) as Record<string, string>;

  if (!userId || !emailType) {
    return json({ error: 'userId and emailType required' }, 400);
  }

  const context = await loadUserContext(supabase, userId);
  if (!context) return json({ error: 'User not found' }, 404);

  const result = await dispatchLifecycleEmail(supabase, context, emailType, extras, {
    force: Boolean(body.force),
    preview: Boolean(body.preview),
  });

  return json(result);
});
