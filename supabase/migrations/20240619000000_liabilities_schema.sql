-- CentFlow — créditos e subscrições (passivos recorrentes)

create table public.credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  outstanding_balance numeric(12, 2) not null check (outstanding_balance >= 0),
  next_payment_date date,
  next_payment_amount numeric(12, 2),
  original_amount numeric(12, 2),
  interest_rate_annual numeric(6, 3),
  index_rate numeric(6, 3),
  spread numeric(6, 3),
  term_months integer,
  monthly_payment numeric(12, 2),
  insurance_monthly numeric(12, 2),
  credit_type text,
  lender text,
  start_date date,
  monthly_income numeric(12, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index credits_user_id_idx on public.credits (user_id);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  billing_interval text not null default 'monthly'
    check (billing_interval in ('monthly', 'quarterly', 'annual')),
  renews_at date,
  category text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);

create trigger credits_set_updated_at
  before update on public.credits
  for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.credits enable row level security;
alter table public.subscriptions enable row level security;

create policy "credits_select_own" on public.credits for select using (auth.uid() = user_id);
create policy "credits_insert_own" on public.credits for insert with check (auth.uid() = user_id);
create policy "credits_update_own" on public.credits for update using (auth.uid() = user_id);
create policy "credits_delete_own" on public.credits for delete using (auth.uid() = user_id);

create policy "subscriptions_select_own" on public.subscriptions for select using (auth.uid() = user_id);
create policy "subscriptions_insert_own" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "subscriptions_update_own" on public.subscriptions for update using (auth.uid() = user_id);
create policy "subscriptions_delete_own" on public.subscriptions for delete using (auth.uid() = user_id);
