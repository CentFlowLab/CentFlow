-- CentFlow — schema inicial (auth, transactions, receipts, OCR)
-- Aplicar com: supabase db push (remoto) ou supabase migration up (local)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Perfis (extensão de auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Dados públicos do utilizador CentFlow';

-- ---------------------------------------------------------------------------
-- Talões (storage + metadados)
-- ---------------------------------------------------------------------------

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  file_name text not null,
  status text not null default 'uploaded'
    check (status in ('pending', 'uploaded', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index receipts_user_id_idx on public.receipts (user_id);

-- ---------------------------------------------------------------------------
-- Resultados OCR
-- ---------------------------------------------------------------------------

create table public.ocr_results (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant_name text,
  total_amount numeric(12, 2),
  receipt_date date,
  suggested_category text,
  confidence numeric(4, 3),
  raw_text text,
  items jsonb not null default '[]'::jsonb,
  source text not null default 'mock'
    check (source in ('mock', 'google_vision', 'device')),
  created_at timestamptz not null default now()
);

create unique index ocr_results_receipt_id_unique on public.ocr_results (receipt_id);
create index ocr_results_user_id_idx on public.ocr_results (user_id);

-- ---------------------------------------------------------------------------
-- Movimentos
-- ---------------------------------------------------------------------------

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount numeric(12, 2) not null check (amount >= 0),
  category text not null,
  description text,
  transaction_date date not null default current_date,
  currency text not null default 'EUR',
  receipt_id uuid references public.receipts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_date_idx on public.transactions (transaction_date desc);

-- ---------------------------------------------------------------------------
-- Triggers: updated_at + perfil ao registar
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger receipts_set_updated_at
  before update on public.receipts
  for each row execute function public.set_updated_at();

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.receipts enable row level security;
alter table public.ocr_results enable row level security;
alter table public.transactions enable row level security;

-- profiles
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- receipts
create policy "receipts_select_own"
  on public.receipts for select
  using (auth.uid() = user_id);

create policy "receipts_insert_own"
  on public.receipts for insert
  with check (auth.uid() = user_id);

create policy "receipts_update_own"
  on public.receipts for update
  using (auth.uid() = user_id);

create policy "receipts_delete_own"
  on public.receipts for delete
  using (auth.uid() = user_id);

-- ocr_results
create policy "ocr_results_select_own"
  on public.ocr_results for select
  using (auth.uid() = user_id);

create policy "ocr_results_insert_own"
  on public.ocr_results for insert
  with check (auth.uid() = user_id);

create policy "ocr_results_update_own"
  on public.ocr_results for update
  using (auth.uid() = user_id);

-- transactions
create policy "transactions_select_own"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "transactions_insert_own"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "transactions_update_own"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "transactions_delete_own"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: bucket receipts (privado, por utilizador)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;

create policy "receipts_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "receipts_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "receipts_storage_update_own"
  on storage.objects for update
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "receipts_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
