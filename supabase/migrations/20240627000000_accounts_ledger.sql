-- Corrigir coluna institution (remoto criado com bank via migration anterior)
-- + transferências entre contas + contribuições para objetivos

alter table public.accounts
  add column if not exists institution text;

update public.accounts
set institution = bank
where institution is null and bank is not null;

-- Sincronizar bank → institution em inserts futuros (compatibilidade)
update public.accounts
set bank = institution
where bank is null and institution is not null;

alter table public.accounts drop constraint if exists accounts_type_check;
alter table public.accounts add constraint accounts_type_check
  check (type in ('checking', 'savings', 'wallet', 'investment', 'other'));

-- Transferências internas (não são receita/despesa)
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check
  check (type in ('expense', 'income', 'transfer'));

alter table public.transactions
  add column if not exists destination_account_id uuid
  references public.accounts (id) on delete set null;

create index if not exists transactions_destination_account_id_idx
  on public.transactions (destination_account_id)
  where destination_account_id is not null;

-- Contribuições para objetivos (dinheiro reservado — não é despesa)
create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists goal_contributions_user_id_idx on public.goal_contributions (user_id);
create index if not exists goal_contributions_goal_id_idx on public.goal_contributions (goal_id);
create index if not exists goal_contributions_account_id_idx on public.goal_contributions (account_id);

alter table public.goal_contributions enable row level security;

do $$ begin
  create policy "goal_contributions_select_own"
    on public.goal_contributions for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "goal_contributions_insert_own"
    on public.goal_contributions for insert with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "goal_contributions_delete_own"
    on public.goal_contributions for delete using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
