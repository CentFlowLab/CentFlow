-- Contas bancárias, ligação a movimentos, garantias → inventário, anexos de fatura

-- ---------------------------------------------------------------------------
-- Contas
-- ---------------------------------------------------------------------------

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'investment', 'wallet')),
  bank text,
  color text,
  icon text,
  initial_balance numeric(12, 2) not null default 0,
  is_active boolean not null default true,
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts (user_id);

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;

create policy "accounts_select_own" on public.accounts for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on public.accounts for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on public.accounts for update using (auth.uid() = user_id);
create policy "accounts_delete_own" on public.accounts for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Movimentos → conta
-- ---------------------------------------------------------------------------

alter table public.transactions
  add column if not exists account_id uuid references public.accounts (id) on delete set null;

create index if not exists transactions_account_id_idx on public.transactions (account_id);

alter table public.transactions
  add column if not exists receipt_url text;

-- ---------------------------------------------------------------------------
-- Garantias → inventário
-- ---------------------------------------------------------------------------

alter table public.warranties
  add column if not exists moved_to_inventory boolean not null default false;

alter table public.warranties
  add column if not exists receipt_url text;

alter table public.inventory_items
  add column if not exists source_warranty_id uuid references public.warranties (id) on delete set null;

alter table public.inventory_items
  add column if not exists warranty_expired_at date;

alter table public.inventory_items
  add column if not exists description text;

alter table public.inventory_items
  add column if not exists receipt_url text;
