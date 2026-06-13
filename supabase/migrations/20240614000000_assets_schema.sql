-- CentFlow — objetivos, garantias, inventário

-- ---------------------------------------------------------------------------
-- Objetivos de poupança
-- ---------------------------------------------------------------------------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  target numeric(12, 2) not null check (target > 0),
  current numeric(12, 2) not null default 0 check (current >= 0),
  currency text not null default 'EUR',
  deadline date,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_user_id_idx on public.goals (user_id);

-- ---------------------------------------------------------------------------
-- Garantias de produtos
-- ---------------------------------------------------------------------------

create table public.warranties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product text not null,
  expires_at date not null,
  purchase_date date,
  store text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index warranties_user_id_idx on public.warranties (user_id);
create index warranties_expires_idx on public.warranties (expires_at);

-- ---------------------------------------------------------------------------
-- Inventário de bens
-- ---------------------------------------------------------------------------

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  value numeric(12, 2) not null check (value >= 0),
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inventory_items_user_id_idx on public.inventory_items (user_id);

-- ---------------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------------

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create trigger warranties_set_updated_at
  before update on public.warranties
  for each row execute function public.set_updated_at();

create trigger inventory_items_set_updated_at
  before update on public.inventory_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.goals enable row level security;
alter table public.warranties enable row level security;
alter table public.inventory_items enable row level security;

create policy "goals_select_own" on public.goals for select using (auth.uid() = user_id);
create policy "goals_insert_own" on public.goals for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on public.goals for update using (auth.uid() = user_id);
create policy "goals_delete_own" on public.goals for delete using (auth.uid() = user_id);

create policy "warranties_select_own" on public.warranties for select using (auth.uid() = user_id);
create policy "warranties_insert_own" on public.warranties for insert with check (auth.uid() = user_id);
create policy "warranties_update_own" on public.warranties for update using (auth.uid() = user_id);
create policy "warranties_delete_own" on public.warranties for delete using (auth.uid() = user_id);

create policy "inventory_select_own" on public.inventory_items for select using (auth.uid() = user_id);
create policy "inventory_insert_own" on public.inventory_items for insert with check (auth.uid() = user_id);
create policy "inventory_update_own" on public.inventory_items for update using (auth.uid() = user_id);
create policy "inventory_delete_own" on public.inventory_items for delete using (auth.uid() = user_id);
