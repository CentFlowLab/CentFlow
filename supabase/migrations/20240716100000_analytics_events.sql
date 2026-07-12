-- Eventos de produto (analytics) — inserção pelo cliente autenticado

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  event text not null,
  properties jsonb not null default '{}'::jsonb,
  environment text not null default 'production'
    check (environment in ('development', 'production', 'beta')),
  created_at timestamptz not null default now()
);

create index analytics_events_user_id_idx on public.analytics_events (user_id);
create index analytics_events_event_idx on public.analytics_events (event);
create index analytics_events_created_at_idx on public.analytics_events (created_at desc);

comment on table public.analytics_events is 'Eventos de produto CentFlow (track/identify)';

alter table public.analytics_events enable row level security;

create policy "analytics_events_insert_own"
  on public.analytics_events for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);

create policy "analytics_events_select_own"
  on public.analytics_events for select
  to authenticated
  using (auth.uid() = user_id);
