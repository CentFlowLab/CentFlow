-- CentFlow — esquema inicial na cloud (Fase 2).
--
-- Princípios:
-- * Cada linha pertence a um utilizador (`user_id`) e a chave primária é (user_id, id): o mesmo
--   UUID pode existir em contas diferentes (ex.: categorias base com identificadores fixos), e as
--   chaves estrangeiras compostas impedem referências a contas/categorias de outro utilizador.
-- * Dinheiro em BIGINT (unidades mínimas). Nunca numeric/float.
-- * Controlo de versões por linha: `version` só avança no servidor e uma alteração tem de indicar
--   a versão sobre a qual foi feita (compare-and-swap). Os relógios dos dispositivos nunca decidem.
-- * `server_seq` é um contador por utilizador atribuído sob bloqueio da linha em `sync_metadata`;
--   a ordem dos valores coincide com a ordem de commit, o que torna a leitura incremental segura.
-- * Eliminação lógica (`deleted_at`). Os clientes não têm permissão de DELETE.
-- * RLS ativa em todas as tabelas, com `auth.uid()`.

-- ---------------------------------------------------------------------------------------------
-- Perfil e metadados de sincronização
-- ---------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sync_metadata (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_seq bigint not null default 0 check (last_seq >= 0),
  -- Linhas eliminadas até esta sequência já foram purgadas: um cliente com cursor anterior tem de
  -- fazer uma ressincronização completa.
  purged_through_seq bigint not null default 0 check (purged_through_seq >= 0),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.sync_metadata (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Dados financeiros
-- ---------------------------------------------------------------------------------------------

create table public.accounts (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  type text not null check (type in ('bank', 'cash', 'savings', 'card', 'investment', 'custom')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  initial_balance bigint not null default 0
    check (initial_balance between -1000000000000 and 1000000000000),
  archived_at timestamptz,
  version bigint not null default 1 check (version >= 1),
  server_seq bigint not null default 0,
  last_op_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table public.categories (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  type text not null check (type in ('income', 'expense')),
  icon text not null check (char_length(icon) between 1 and 64),
  color text not null check (char_length(color) between 1 and 32),
  -- Categoria base (ex.: 'groceries'); null para categorias criadas pelo utilizador.
  system_key text check (system_key is null or system_key ~ '^[a-zA-Z]{1,40}$'),
  version bigint not null default 1 check (version >= 1),
  server_seq bigint not null default 0,
  last_op_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table public.entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount bigint not null check (amount > 0 and amount <= 1000000000000),
  description text not null default '' check (char_length(description) <= 140),
  notes text check (notes is null or char_length(notes) <= 1000),
  category_id uuid,
  account_id uuid not null,
  destination_account_id uuid,
  date date not null check (date between date '1900-01-01' and date '2100-12-31'),
  version bigint not null default 1 check (version >= 1),
  server_seq bigint not null default 0,
  last_op_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id),
  foreign key (user_id, account_id) references public.accounts (user_id, id),
  foreign key (user_id, destination_account_id) references public.accounts (user_id, id),
  foreign key (user_id, category_id) references public.categories (user_id, id),
  check (
    (type = 'transfer'
      and category_id is null
      and destination_account_id is not null
      and destination_account_id <> account_id)
    or
    (type in ('income', 'expense')
      and category_id is not null
      and destination_account_id is null)
  )
);

create index accounts_pull_idx on public.accounts (user_id, server_seq);
create index categories_pull_idx on public.categories (user_id, server_seq);
create index entries_pull_idx on public.entries (user_id, server_seq);
create index entries_date_idx on public.entries (user_id, date desc) where deleted_at is null;
create index entries_account_idx on public.entries (user_id, account_id);
create index entries_destination_idx on public.entries (user_id, destination_account_id)
  where destination_account_id is not null;
create index entries_category_idx on public.entries (user_id, category_id)
  where category_id is not null;
create index accounts_deleted_idx on public.accounts (deleted_at) where deleted_at is not null;
create index categories_deleted_idx on public.categories (deleted_at) where deleted_at is not null;
create index entries_deleted_idx on public.entries (deleted_at) where deleted_at is not null;

-- ---------------------------------------------------------------------------------------------
-- Versões e sequência (todas as escritas, por qualquer caminho)
-- ---------------------------------------------------------------------------------------------

create function public.sync_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id or new.id is distinct from old.id then
      raise exception 'immutable_key' using errcode = 'CF422';
    end if;
    -- Compare-and-swap: quem escreve indica a versão que leu.
    if new.version is distinct from old.version then
      raise exception 'version_conflict' using errcode = 'CF409';
    end if;
    new.version := old.version + 1;
    new.created_at := old.created_at;
  else
    new.version := 1;
  end if;

  -- Bloqueia a linha do utilizador até ao commit: serializa as escritas de cada utilizador e
  -- garante que a ordem de `server_seq` é a ordem de commit.
  update public.sync_metadata
     set last_seq = last_seq + 1, updated_at = now()
   where user_id = new.user_id
  returning last_seq into new.server_seq;
  if not found then
    raise exception 'sync_metadata_missing' using errcode = 'CF422';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger a_sync_stamp before insert or update on public.accounts
  for each row execute function public.sync_stamp();
create trigger a_sync_stamp before insert or update on public.categories
  for each row execute function public.sync_stamp();
create trigger a_sync_stamp before insert or update on public.entries
  for each row execute function public.sync_stamp();

-- ---------------------------------------------------------------------------------------------
-- Integridade financeira (não depende do cliente)
-- ---------------------------------------------------------------------------------------------

create function public.entries_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_source_currency text;
  v_destination_currency text;
  v_category_type text;
begin
  if new.deleted_at is not null then
    return new;
  end if;

  select currency into v_source_currency
    from public.accounts
   where user_id = new.user_id and id = new.account_id and deleted_at is null;
  if not found then
    raise exception 'account_unavailable' using errcode = 'CF422';
  end if;

  if new.type = 'transfer' then
    select currency into v_destination_currency
      from public.accounts
     where user_id = new.user_id and id = new.destination_account_id and deleted_at is null;
    if not found then
      raise exception 'account_unavailable' using errcode = 'CF422';
    end if;
    if v_destination_currency <> v_source_currency then
      raise exception 'currency_mismatch' using errcode = 'CF422';
    end if;
  else
    select type into v_category_type
      from public.categories
     where user_id = new.user_id and id = new.category_id and deleted_at is null;
    if not found then
      raise exception 'category_unavailable' using errcode = 'CF422';
    end if;
    if v_category_type <> new.type then
      raise exception 'category_type_mismatch' using errcode = 'CF422';
    end if;
  end if;
  return new;
end;
$$;

create trigger b_integrity before insert or update on public.entries
  for each row execute function public.entries_integrity();

create function public.accounts_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_in_use boolean;
begin
  if new.currency is distinct from old.currency
     or (new.deleted_at is not null and old.deleted_at is null) then
    select exists (
      select 1 from public.entries e
       where e.user_id = new.user_id
         and e.deleted_at is null
         and (e.account_id = new.id or e.destination_account_id = new.id)
    ) into v_in_use;
    if v_in_use and new.currency is distinct from old.currency then
      raise exception 'currency_locked' using errcode = 'CF422';
    end if;
    if v_in_use then
      raise exception 'account_in_use' using errcode = 'CF422';
    end if;
  end if;
  return new;
end;
$$;

create trigger b_integrity before update on public.accounts
  for each row execute function public.accounts_integrity();

create function public.categories_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_in_use boolean;
begin
  if new.type is distinct from old.type
     or (new.deleted_at is not null and old.deleted_at is null) then
    select exists (
      select 1 from public.entries e
       where e.user_id = new.user_id and e.deleted_at is null and e.category_id = new.id
    ) into v_in_use;
    if v_in_use and new.type is distinct from old.type then
      raise exception 'type_locked' using errcode = 'CF422';
    end if;
    if v_in_use then
      raise exception 'category_in_use' using errcode = 'CF422';
    end if;
  end if;
  return new;
end;
$$;

create trigger b_integrity before update on public.categories
  for each row execute function public.categories_integrity();

-- ---------------------------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.sync_metadata enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.entries enable row level security;

create policy "profiles: select own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "sync_metadata: select own" on public.sync_metadata
  for select to authenticated using (user_id = (select auth.uid()));

create policy "accounts: select own" on public.accounts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "accounts: insert own" on public.accounts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "accounts: update own" on public.accounts
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "categories: select own" on public.categories
  for select to authenticated using (user_id = (select auth.uid()));
create policy "categories: insert own" on public.categories
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "categories: update own" on public.categories
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "entries: select own" on public.entries
  for select to authenticated using (user_id = (select auth.uid()));
create policy "entries: insert own" on public.entries
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "entries: update own" on public.entries
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Privilégios explícitos (o Supabase concede tudo por omissão em `public`). Sem DELETE: a
-- eliminação é lógica, para que se propague a todos os dispositivos.
revoke all on public.profiles, public.sync_metadata, public.accounts, public.categories,
  public.entries from anon, authenticated;
grant select, update (display_name) on public.profiles to authenticated;
grant select on public.sync_metadata to authenticated;
grant select, insert, update on public.accounts, public.categories, public.entries
  to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.sync_stamp() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.entries_integrity() from public, anon, authenticated;
revoke all on function public.accounts_integrity() from public, anon, authenticated;
revoke all on function public.categories_integrity() from public, anon, authenticated;
