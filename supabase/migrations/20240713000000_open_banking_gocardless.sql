-- Open Banking (GoCardless Bank Account Data) — ligações e origem de transações

create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution_id text not null,
  institution_name text not null,
  requisition_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'linked', 'expired', 'revoked', 'error')),
  last_sync_at timestamptz,
  last_sync_status text not null default 'never'
    check (last_sync_status in ('never', 'success', 'failed')),
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_connections_requisition_id_key unique (requisition_id)
);

create index if not exists bank_connections_user_id_idx on public.bank_connections (user_id);
create index if not exists bank_connections_status_idx on public.bank_connections (status);

create table if not exists public.bank_connection_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid not null references public.bank_connections (id) on delete cascade,
  gocardless_account_id text not null,
  iban text,
  name text,
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  constraint bank_connection_accounts_gc_account_key unique (gocardless_account_id)
);

create index if not exists bank_connection_accounts_connection_id_idx
  on public.bank_connection_accounts (connection_id);

alter table public.bank_connections enable row level security;
alter table public.bank_connection_accounts enable row level security;

create policy "bank_connections_select_own"
  on public.bank_connections for select using (auth.uid() = user_id);
create policy "bank_connections_insert_own"
  on public.bank_connections for insert with check (auth.uid() = user_id);
create policy "bank_connections_update_own"
  on public.bank_connections for update using (auth.uid() = user_id);
create policy "bank_connections_delete_own"
  on public.bank_connections for delete using (auth.uid() = user_id);

create policy "bank_connection_accounts_select_own"
  on public.bank_connection_accounts for select using (auth.uid() = user_id);
create policy "bank_connection_accounts_insert_own"
  on public.bank_connection_accounts for insert with check (auth.uid() = user_id);
create policy "bank_connection_accounts_delete_own"
  on public.bank_connection_accounts for delete using (auth.uid() = user_id);

create trigger bank_connections_set_updated_at
  before update on public.bank_connections
  for each row execute function public.set_updated_at();

-- Origem da transação (manual vs open banking)
alter table public.transactions
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'open_banking'));

alter table public.transactions
  add column if not exists external_id text;

alter table public.transactions
  add column if not exists bank_connection_id uuid references public.bank_connections (id) on delete set null;

create unique index if not exists transactions_user_external_id_idx
  on public.transactions (user_id, external_id)
  where external_id is not null;

create index if not exists transactions_source_idx on public.transactions (source);
create index if not exists transactions_bank_connection_id_idx
  on public.transactions (bank_connection_id)
  where bank_connection_id is not null;
