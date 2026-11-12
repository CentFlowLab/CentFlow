-- Integrações de leitura (ADR-064): Trading 212.
--
-- 1. `public.integrations`: estado da ligação de cada pessoa (sem segredos). Só leitura pela app.
-- 2. `public.investment_snapshots`: último retrato da conta (resumo + posições), só leitura.
-- 3. `private.integration_secrets`: chave e segredo da API **cifrados** (AES-GCM) pela Edge
--    Function `t212`, com uma chave que só existe nos segredos da função. Nenhum papel da app
--    (anon/authenticated) lhe toca; o esquema `private` não está exposto.
-- Escritas: só a Edge Function (service_role). Eliminar a conta apaga tudo (cascade).
--
-- Não aplicar sem autorização expressa (staging primeiro; produção depois).

create table public.integrations (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('trading212')),
  environment text not null check (environment in ('live', 'demo')),
  status text not null check (status in ('connected', 'error')),
  last_sync_at timestamptz,
  last_error text check (
    last_error is null or last_error in ('unauthorized', 'rateLimited', 'unavailable', 'invalid')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create table public.investment_snapshots (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('trading212')),
  taken_at timestamptz not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  total bigint not null,
  data jsonb not null,
  primary key (user_id, provider)
);

create table private.integration_secrets (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('trading212')),
  iv text not null,
  ciphertext text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.integrations enable row level security;
alter table public.investment_snapshots enable row level security;
alter table private.integration_secrets enable row level security;

revoke all on public.integrations, public.investment_snapshots from anon, authenticated;
revoke all on private.integration_secrets from anon, authenticated;
grant select on public.integrations, public.investment_snapshots to authenticated;

create policy integrations_read_own on public.integrations
  for select to authenticated using (user_id = (select auth.uid()));
create policy investment_snapshots_read_own on public.investment_snapshots
  for select to authenticated using (user_id = (select auth.uid()));

-- O esquema `private` não está exposto na API: a Edge Function chega aos segredos só por estas
-- funções, que nenhum papel da app pode executar (só service_role).
create function public.integration_secret_put(p_user uuid, p_provider text, p_iv text, p_ciphertext text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.integration_secrets (user_id, provider, iv, ciphertext)
  values (p_user, p_provider, p_iv, p_ciphertext)
  on conflict (user_id, provider)
  do update set iv = excluded.iv, ciphertext = excluded.ciphertext, created_at = now();
$$;

create function public.integration_secret_get(p_user uuid, p_provider text)
returns table (iv text, ciphertext text)
language sql
security definer
set search_path = ''
as $$
  select s.iv, s.ciphertext from private.integration_secrets s
   where s.user_id = p_user and s.provider = p_provider;
$$;

create function public.integration_secret_delete(p_user uuid, p_provider text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.integration_secrets where user_id = p_user and provider = p_provider;
$$;

revoke all on function public.integration_secret_put(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.integration_secret_get(uuid, text) from public, anon, authenticated;
revoke all on function public.integration_secret_delete(uuid, text) from public, anon, authenticated;
grant execute on function public.integration_secret_put(uuid, text, text, text) to service_role;
grant execute on function public.integration_secret_get(uuid, text) to service_role;
grant execute on function public.integration_secret_delete(uuid, text) to service_role;
