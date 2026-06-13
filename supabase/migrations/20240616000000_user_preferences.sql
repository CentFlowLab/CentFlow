-- Preferências de utilizador (notificações, região, tema, biometria)

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  push_notifications boolean not null default true,
  warranty_alerts boolean not null default true,
  budget_alerts boolean not null default false,
  weekly_digest boolean not null default true,
  region text not null default 'portugal'
    check (region in ('portugal', 'brasil', 'espanha', 'outro')),
  theme_id text not null default 'dark-premium'
    check (theme_id in ('dark-premium', 'dark-classic')),
  biometrics_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_preferences is 'Preferências da app CentFlow por utilizador';

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- Criar preferências por defeito quando um perfil é criado
create or replace function public.handle_new_user_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created_preferences
  after insert on public.profiles
  for each row execute function public.handle_new_user_preferences();

alter table public.user_preferences enable row level security;

create policy "user_preferences_select_own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "user_preferences_insert_own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "user_preferences_update_own"
  on public.user_preferences for update
  using (auth.uid() = user_id);
