-- Contas bancárias / carteiras do utilizador
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null default 'checking'
    check (type in ('checking', 'savings', 'wallet', 'investment', 'other')),
  institution text,
  color text,
  icon text,
  initial_balance numeric(12, 2) not null default 0,
  is_active boolean not null default true,
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts (user_id);

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;

create policy "accounts_select_own"
  on public.accounts for select using (auth.uid() = user_id);

create policy "accounts_insert_own"
  on public.accounts for insert with check (auth.uid() = user_id);

create policy "accounts_update_own"
  on public.accounts for update using (auth.uid() = user_id);

create policy "accounts_delete_own"
  on public.accounts for delete using (auth.uid() = user_id);

alter table public.transactions
  add column if not exists account_id uuid references public.accounts (id) on delete set null;

create index if not exists transactions_account_id_idx
  on public.transactions (account_id)
  where account_id is not null;
