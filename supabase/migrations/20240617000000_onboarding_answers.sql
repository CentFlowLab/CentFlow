-- Respostas do onboarding conversacional CentFlow

create table public.onboarding_answers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  skipped boolean not null default false,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.onboarding_answers is 'Respostas do onboarding conversacional por utilizador';

create trigger onboarding_answers_set_updated_at
  before update on public.onboarding_answers
  for each row execute function public.set_updated_at();

alter table public.onboarding_answers enable row level security;

create policy "onboarding_answers_select_own"
  on public.onboarding_answers for select
  using (auth.uid() = user_id);

create policy "onboarding_answers_insert_own"
  on public.onboarding_answers for insert
  with check (auth.uid() = user_id);

create policy "onboarding_answers_update_own"
  on public.onboarding_answers for update
  using (auth.uid() = user_id);
