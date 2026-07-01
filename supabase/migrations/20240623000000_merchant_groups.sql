-- Grupos de comerciantes (agrupamento fuzzy de descrições de movimentos)

create table if not exists public.merchant_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  aliases text[] not null default '{}',
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists merchant_groups_user_id_idx on public.merchant_groups (user_id);

alter table public.merchant_groups enable row level security;

create policy "merchant_groups_select_own"
  on public.merchant_groups for select
  using (auth.uid() = user_id);

create policy "merchant_groups_insert_own"
  on public.merchant_groups for insert
  with check (auth.uid() = user_id);

create policy "merchant_groups_update_own"
  on public.merchant_groups for update
  using (auth.uid() = user_id);

create policy "merchant_groups_delete_own"
  on public.merchant_groups for delete
  using (auth.uid() = user_id);

create trigger merchant_groups_set_updated_at
  before update on public.merchant_groups
  for each row execute function public.set_updated_at();

alter table public.transactions
  add column if not exists merchant_group_id uuid references public.merchant_groups (id) on delete set null;

create index if not exists transactions_merchant_group_id_idx
  on public.transactions (merchant_group_id)
  where merchant_group_id is not null;
