import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { dispatchLifecycleEmail } from '../_shared/email/dispatch.ts';
import type { EmailUserContext } from '../_shared/email/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-cron-secret, authorization, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type JobStats = Record<string, number>;

async function loadUserContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  email: string,
  name: string,
): Promise<EmailUserContext> {
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
    email,
    name,
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

function bump(stats: JobStats, key: string) {
  stats[key] = (stats[key] ?? 0) + 1;
}

async function buildWeeklyDigestSummary(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: movementCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', weekAgo);

  const movements = movementCount ?? 0;
  const movementLine =
    movements > 0
      ? `Esta semana registaste ${movements} movimento${movements === 1 ? '' : 's'}. `
      : '';

  return `${movementLine}Abre a CentFlow para rever objectivos, prazos e evolução do património — sem expor valores sensíveis por email.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get('EMAIL_CRON_SECRET');
  const authHeader = req.headers.get('Authorization') ?? '';
  const cronHeader = req.headers.get('x-cron-secret') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  const authorized =
    (cronSecret && cronHeader === cronSecret) ||
    (serviceKey && authHeader === `Bearer ${serviceKey}`);

  if (!authorized) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const stats: JobStats = {};
  const now = new Date();

  // -------------------------------------------------------------------------
  // Welcome — contas criadas nas últimas 2 horas
  // -------------------------------------------------------------------------
  const welcomeSince = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const { data: newProfiles } = await supabase
    .from('profiles')
    .select('id, name, created_at')
    .gte('created_at', welcomeSince);

  for (const profile of newProfiles ?? []) {
    const { data: authData } = await supabase.auth.admin.getUserById(profile.id);
    if (!authData.user?.email) continue;

    const context = await loadUserContext(
      supabase,
      profile.id,
      authData.user.email,
      profile.name ?? 'Utilizador',
    );

    const result = await dispatchLifecycleEmail(supabase, context, 'welcome');
    bump(stats, result.skipped ? 'welcome_skipped' : result.ok ? 'welcome_sent' : 'welcome_failed');
  }

  // -------------------------------------------------------------------------
  // Onboarding incompleto — conta > 24h, onboarding não concluído
  // -------------------------------------------------------------------------
  const onboardingSince = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data: incompleteOnboarding } = await supabase
    .from('onboarding_answers')
    .select('user_id, completed')
    .eq('completed', false);

  for (const row of incompleteOnboarding ?? []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, created_at')
      .eq('id', row.user_id)
      .maybeSingle();

    if (!profile || profile.created_at > onboardingSince) {
      continue;
    }

    const { data: authData } = await supabase.auth.admin.getUserById(row.user_id);
    if (!authData.user?.email) continue;

    const context = await loadUserContext(
      supabase,
      row.user_id,
      authData.user.email,
      profile.name ?? 'Utilizador',
    );

    const result = await dispatchLifecycleEmail(supabase, context, 'onboarding_incomplete');
    bump(stats, result.skipped ? 'onboarding_skipped' : result.ok ? 'onboarding_sent' : 'onboarding_failed');
  }

  // -------------------------------------------------------------------------
  // Primeiro passo em falta — conta > 3 dias, sem dados financeiros
  // -------------------------------------------------------------------------
  const firstStepSince = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: allProfiles } = await supabase.from('profiles').select('id, name, created_at');

  for (const profile of allProfiles ?? []) {
    if (profile.created_at > firstStepSince) continue;

    const { data: hasData } = await supabase.rpc('user_has_any_financial_data', {
      p_user_id: profile.id,
    });

    if (hasData) continue;

    const { data: authData } = await supabase.auth.admin.getUserById(profile.id);
    if (!authData.user?.email) continue;

    const context = await loadUserContext(
      supabase,
      profile.id,
      authData.user.email,
      profile.name ?? 'Utilizador',
    );

    const result = await dispatchLifecycleEmail(supabase, context, 'first_step_missing');
    bump(stats, result.skipped ? 'first_step_skipped' : result.ok ? 'first_step_sent' : 'first_step_failed');
  }

  // -------------------------------------------------------------------------
  // Inactividade 7 / 30 dias
  // -------------------------------------------------------------------------
  for (const profile of allProfiles ?? []) {
    const { data: lastActive } = await supabase.rpc('user_last_activity', {
      p_user_id: profile.id,
    });

    if (!lastActive) continue;

    const last = new Date(lastActive as string).getTime();
    const daysInactive = (now.getTime() - last) / (24 * 60 * 60 * 1000);

    const { data: authData } = await supabase.auth.admin.getUserById(profile.id);
    if (!authData.user?.email) continue;

    const context = await loadUserContext(
      supabase,
      profile.id,
      authData.user.email,
      profile.name ?? 'Utilizador',
    );

    if (daysInactive >= 7 && daysInactive < 14) {
      const result = await dispatchLifecycleEmail(supabase, context, 'inactive_7d');
      bump(stats, result.skipped ? 'inactive7_skipped' : result.ok ? 'inactive7_sent' : 'inactive7_failed');
    } else if (daysInactive >= 30 && daysInactive < 45) {
      const result = await dispatchLifecycleEmail(supabase, context, 'inactive_30d');
      bump(stats, result.skipped ? 'inactive30_skipped' : result.ok ? 'inactive30_sent' : 'inactive30_failed');
    }
  }

  // -------------------------------------------------------------------------
  // Garantias a expirar (30 dias)
  // -------------------------------------------------------------------------
  const warrantyLimit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: warranties } = await supabase
    .from('warranties')
    .select('user_id, product, expires_at')
    .lte('expires_at', warrantyLimit)
    .gte('expires_at', now.toISOString().slice(0, 10));

  for (const warranty of warranties ?? []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', warranty.user_id)
      .maybeSingle();

    const { data: authData } = await supabase.auth.admin.getUserById(warranty.user_id);
    if (!authData.user?.email) continue;

    const context = await loadUserContext(
      supabase,
      warranty.user_id,
      authData.user.email,
      profile?.name ?? 'Utilizador',
    );

    const result = await dispatchLifecycleEmail(supabase, context, 'warranty_expiring', {
      product: warranty.product ?? '',
    });
    bump(stats, result.skipped ? 'warranty_skipped' : result.ok ? 'warranty_sent' : 'warranty_failed');
  }

  // -------------------------------------------------------------------------
  // Subscrições a renovar (7 dias)
  // -------------------------------------------------------------------------
  const renewLimit = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('user_id, name, renews_at')
    .not('renews_at', 'is', null)
    .lte('renews_at', renewLimit)
    .gte('renews_at', now.toISOString().slice(0, 10));

  for (const sub of subscriptions ?? []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', sub.user_id)
      .maybeSingle();

    const { data: authData } = await supabase.auth.admin.getUserById(sub.user_id);
    if (!authData.user?.email) continue;

    const context = await loadUserContext(
      supabase,
      sub.user_id,
      authData.user.email,
      profile?.name ?? 'Utilizador',
    );

    const result = await dispatchLifecycleEmail(supabase, context, 'subscription_renewal', {
      name: sub.name ?? '',
    });
    bump(stats, result.skipped ? 'subscription_skipped' : result.ok ? 'subscription_sent' : 'subscription_failed');
  }

  // -------------------------------------------------------------------------
  // Créditos — prestação próxima (7 dias)
  // -------------------------------------------------------------------------
  const { data: credits } = await supabase
    .from('credits')
    .select('user_id, name, next_payment_date')
    .not('next_payment_date', 'is', null)
    .lte('next_payment_date', renewLimit)
    .gte('next_payment_date', now.toISOString().slice(0, 10));

  for (const credit of credits ?? []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', credit.user_id)
      .maybeSingle();

    const { data: authData } = await supabase.auth.admin.getUserById(credit.user_id);
    if (!authData.user?.email) continue;

    const context = await loadUserContext(
      supabase,
      credit.user_id,
      authData.user.email,
      profile?.name ?? 'Utilizador',
    );

    const result = await dispatchLifecycleEmail(supabase, context, 'credit_payment_due', {
      name: credit.name ?? '',
    });
    bump(stats, result.skipped ? 'credit_skipped' : result.ok ? 'credit_sent' : 'credit_failed');
  }

  // -------------------------------------------------------------------------
  // Resumo semanal — domingo UTC (ajustável)
  // -------------------------------------------------------------------------
  if (now.getUTCDay() === 0) {
    for (const profile of allProfiles ?? []) {
      const { data: hasData } = await supabase.rpc('user_has_any_financial_data', {
        p_user_id: profile.id,
      });
      if (!hasData) continue;

      const { data: authData } = await supabase.auth.admin.getUserById(profile.id);
      if (!authData.user?.email) continue;

      const context = await loadUserContext(
        supabase,
        profile.id,
        authData.user.email,
        profile.name ?? 'Utilizador',
      );

      const result = await dispatchLifecycleEmail(supabase, context, 'weekly_digest', {
        summary: await buildWeeklyDigestSummary(supabase, profile.id),
      });
      bump(stats, result.skipped ? 'weekly_skipped' : result.ok ? 'weekly_sent' : 'weekly_failed');
    }
  }

  // -------------------------------------------------------------------------
  // Dicas e insights — quarta-feira UTC, utilizadores com dados
  // -------------------------------------------------------------------------
  if (now.getUTCDay() === 3) {
    for (const profile of allProfiles ?? []) {
      const { data: hasData } = await supabase.rpc('user_has_any_financial_data', {
        p_user_id: profile.id,
      });
      if (!hasData) continue;

      const { data: authData } = await supabase.auth.admin.getUserById(profile.id);
      if (!authData.user?.email) continue;

      const context = await loadUserContext(
        supabase,
        profile.id,
        authData.user.email,
        profile.name ?? 'Utilizador',
      );

      const result = await dispatchLifecycleEmail(supabase, context, 'tips_insight', {
        tip: 'Revê a aba Análises para veres como o teu património está distribuído e onde podes optimizar.',
      });
      bump(stats, result.skipped ? 'tips_skipped' : result.ok ? 'tips_sent' : 'tips_failed');
    }
  }

  return json({ ok: true, stats, ranAt: now.toISOString() });
});
