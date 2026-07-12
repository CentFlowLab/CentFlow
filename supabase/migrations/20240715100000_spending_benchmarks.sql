-- Benchmarks de gasto agregados e anonimizados (opt-in explícito)

alter table public.user_preferences
  add column if not exists benchmark_contribution_consent boolean not null default false;

comment on column public.user_preferences.benchmark_contribution_consent is
  'Opt-in explícito para contribuir com agregados anonimizados de gasto (default OFF).';

-- Apenas estatísticas agregadas — sem user_id, hashes ou valores exactos de rendimento
create table if not exists public.spending_benchmarks (
  id uuid primary key default gen_random_uuid(),
  income_bucket_key text not null,
  income_bucket_label text not null,
  category text not null,
  region text not null default 'PT',
  mean_amount numeric(12, 2) not null check (mean_amount >= 0),
  median_amount numeric(12, 2) not null check (median_amount >= 0),
  sample_count integer not null check (sample_count >= 30),
  period_month_key text not null,
  computed_at timestamptz not null default now(),
  constraint spending_benchmarks_bucket_category_region_month_key
    unique (income_bucket_key, category, region, period_month_key)
);

create index if not exists spending_benchmarks_bucket_region_idx
  on public.spending_benchmarks (income_bucket_key, region, period_month_key);

comment on table public.spending_benchmarks is
  'Médias/medianas de gasto por categoria e faixa de rendimento — só buckets com ≥30 utilizadores opt-in.';

alter table public.spending_benchmarks enable row level security;

-- Leitura para utilizadores autenticados (dados já anonimizados e com k-anonymity)
create policy "spending_benchmarks_select_authenticated"
  on public.spending_benchmarks for select
  to authenticated
  using (true);

-- Escrita apenas via service role (Edge Function cron)
