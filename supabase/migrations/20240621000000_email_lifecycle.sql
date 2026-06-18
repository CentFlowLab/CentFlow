-- Lifecycle email: eventos, preferências e helpers de actividade

-- ---------------------------------------------------------------------------
-- Preferências de email (opt-in lifecycle; segurança via Supabase Auth)
-- ---------------------------------------------------------------------------

alter table public.user_preferences
  add column if not exists email_important boolean not null default true,
  add column if not exists email_weekly_digest boolean not null default true,
  add column if not exists email_warranty_alerts boolean not null default true,
  add column if not exists email_subscription_renewals boolean not null default true,
  add column if not exists email_credit_payments boolean not null default true,
  add column if not exists email_tips_insights boolean not null default true;

comment on column public.user_preferences.email_important is 'Emails lifecycle: onboarding, inactividade, primeiro passo';
comment on column public.user_preferences.email_weekly_digest is 'Resumo semanal por email';
comment on column public.user_preferences.email_warranty_alerts is 'Garantias a expirar por email';
comment on column public.user_preferences.email_subscription_renewals is 'Subscrições a renovar por email';
comment on column public.user_preferences.email_credit_payments is 'Prestações próximas por email';
comment on column public.user_preferences.email_tips_insights is 'Dicas e insights financeiros por email';

-- ---------------------------------------------------------------------------
-- Log de emails (deduplicação + auditoria)
-- ---------------------------------------------------------------------------

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email_type text not null,
  status text not null default 'sent'
    check (status in ('sent', 'failed', 'skipped', 'preview')),
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  error text,
  sent_at timestamptz not null default now()
);

create index if not exists email_events_user_type_sent_idx
  on public.email_events (user_id, email_type, sent_at desc);

create index if not exists email_events_sent_at_idx
  on public.email_events (sent_at desc);

alter table public.email_events enable row level security;

create policy "email_events_select_own"
  on public.email_events for select
  using (auth.uid() = user_id);

-- Inserções apenas via service role (Edge Functions / jobs)

-- ---------------------------------------------------------------------------
-- Helpers SQL para jobs
-- ---------------------------------------------------------------------------

create or replace function public.user_last_activity(p_user_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    coalesce((select created_at from profiles where id = p_user_id), '1970-01-01'::timestamptz),
    coalesce((select max(created_at) from transactions where user_id = p_user_id), '1970-01-01'::timestamptz),
    coalesce((select max(updated_at) from onboarding_answers where user_id = p_user_id), '1970-01-01'::timestamptz)
  );
$$;

create or replace function public.user_has_any_financial_data(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from transactions where user_id = p_user_id)
    or exists(select 1 from subscriptions where user_id = p_user_id)
    or exists(select 1 from credits where user_id = p_user_id)
    or exists(select 1 from goals where user_id = p_user_id)
    or exists(select 1 from warranties where user_id = p_user_id)
    or exists(select 1 from inventory_items where user_id = p_user_id);
$$;
