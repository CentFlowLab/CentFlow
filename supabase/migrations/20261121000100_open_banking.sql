-- Open banking (ADR-069): contas bancárias ligadas por um agregador licenciado (Enable Banking,
-- PSD2, só leitura).
--
-- 1. `public.bank_connections`: uma autorização (consentimento) num banco. A app lê o estado;
--    `session_id` (identificador da sessão no agregador) não é legível pela app.
-- 2. `public.bank_accounts`: contas dessa autorização com o último saldo lido. `uid`
--    (identificador da conta no agregador) não é legível pela app.
--    `app_account_id`/`import_from`: a que conta da app corresponde e desde quando os movimentos
--    entram; só por `bank_account_link()` (a própria pessoa), para valer em todos os aparelhos.
-- 3. `public.bank_auth_states`: pedidos de autorização em curso (30 min), só para a função
--    confirmar que o regresso do banco pertence a quem o pediu. A app não lhe toca.
-- Escritas: só a Edge Function `open-banking` (service_role). Nenhum movimento é guardado no
-- servidor por esta via: a app recebe-os e regista-os na base local, que sincroniza como sempre.
-- Eliminar a conta apaga tudo (cascade); a ligação no agregador expira com o consentimento.
--
-- Reversão: `drop table public.bank_auth_states, public.bank_accounts, public.bank_connections;`
-- Não aplicar sem autorização expressa (staging primeiro; produção depois).

create table public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'enablebanking' check (provider in ('enablebanking')),
  session_id text not null,
  aspsp_name text not null check (char_length(aspsp_name) between 1 and 200),
  aspsp_country text not null check (aspsp_country ~ '^[A-Z]{2}$'),
  status text not null check (status in ('connected', 'expired', 'error')),
  valid_until timestamptz not null,
  last_sync_at timestamptz,
  last_error text check (
    last_error is null
    or last_error in ('unauthorized', 'expired', 'rateLimited', 'unavailable', 'invalid')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bank_connections_user on public.bank_connections (user_id);

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.bank_connections (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  uid text not null,
  name text check (name is null or char_length(name) <= 200),
  iban_last4 text check (iban_last4 is null or iban_last4 ~ '^[0-9A-Z]{1,4}$'),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  balance bigint,
  balance_at timestamptz,
  app_account_id uuid,
  import_from date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, uid)
);

create index bank_accounts_user on public.bank_accounts (user_id);

create table public.bank_auth_states (
  state text primary key check (char_length(state) between 16 and 80),
  user_id uuid not null references auth.users (id) on delete cascade,
  aspsp_name text not null,
  aspsp_country text not null,
  created_at timestamptz not null default now()
);

alter table public.bank_connections enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.bank_auth_states enable row level security;

revoke all on public.bank_connections, public.bank_accounts, public.bank_auth_states
  from anon, authenticated;

-- Só as colunas que a app precisa; os identificadores do agregador ficam de fora.
grant select (
  id, provider, aspsp_name, aspsp_country, status, valid_until, last_sync_at, last_error,
  created_at, updated_at
) on public.bank_connections to authenticated;
grant select (
  id, connection_id, name, iban_last4, currency, balance, balance_at, app_account_id,
  import_from, created_at, updated_at
) on public.bank_accounts to authenticated;

create policy bank_connections_read_own on public.bank_connections
  for select to authenticated using (user_id = (select auth.uid()));
create policy bank_accounts_read_own on public.bank_accounts
  for select to authenticated using (user_id = (select auth.uid()));

-- Associa (ou desassocia, com nulos) uma conta do banco a uma conta da app. Só a própria pessoa;
-- a conta da app tem de ser dela e não estar eliminada.
create function public.bank_account_link(p_id uuid, p_app_account uuid, p_import_from date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_app_account is not null and not exists (
    select 1 from public.accounts a
     where a.id = p_app_account and a.user_id = (select auth.uid()) and a.deleted_at is null
  ) then
    raise exception 'invalid account' using errcode = '22023';
  end if;
  update public.bank_accounts
     set app_account_id = p_app_account,
         import_from = case when p_app_account is null then null else p_import_from end,
         updated_at = now()
   where id = p_id and user_id = (select auth.uid());
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.bank_account_link(uuid, uuid, date) from public, anon;
grant execute on function public.bank_account_link(uuid, uuid, date) to authenticated;
