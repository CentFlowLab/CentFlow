-- Proteção contra enumeração e abuso nas funções públicas da autenticação (ADR-045).
--
-- 1. `email_registered` deixa de existir: dizia a qualquer pessoa, sem sessão, se um email tinha
--    conta. O ecrã de entrar passa a dizer sempre "Email ou palavra-passe incorretos".
--    As apps anteriores tratam a falta da função como "não sei" e mostram essa mesma frase.
-- 2. `username_available` e `login_email` passam a ter um limite por endereço de origem (o
--    primeiro IP de `x-forwarded-for`, que a API do Supabase preenche). Sem esse cabeçalho (por
--    exemplo, chamadas internas) não há limite por origem: nunca se bloqueia toda a gente ao mesmo
--    tempo. O limite por nome de `login_email` (10 falhas em 15 minutos) mantém-se.

drop function if exists public.email_registered(text);

-- Pedidos recentes por tipo e origem. Sem políticas: só as funções abaixo lhe tocam.
create table public.lookup_attempts (
  kind text not null check (kind in ('username_available', 'login_failure')),
  client text not null check (length(client) between 1 and 64),
  attempted_at timestamptz not null default now()
);

create index lookup_attempts_kind_client_time
  on public.lookup_attempts (kind, client, attempted_at);

alter table public.lookup_attempts enable row level security;
revoke all on table public.lookup_attempts from anon, authenticated;

create schema if not exists private;

-- Origem do pedido: primeiro endereço de `x-forwarded-for`; `null` se não houver.
create or replace function private.request_client()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(
    left(btrim(split_part(
      coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''),
      ',', 1)), 64),
    '');
$$;

-- Conta um pedido e recusa acima do limite na janela. Sem origem, não limita.
create or replace function private.throttle(p_kind text, p_limit int, p_window interval)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  origin text := private.request_client();
begin
  if origin is null then
    return;
  end if;
  delete from public.lookup_attempts where attempted_at < now() - interval '1 day';
  if (
    select count(*) from public.lookup_attempts
    where kind = p_kind and client = origin and attempted_at > now() - p_window
  ) >= p_limit then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.lookup_attempts (kind, client) values (p_kind, origin);
end;
$$;

revoke all on function private.request_client() from public;
revoke all on function private.throttle(text, int, interval) from public;

-- Disponibilidade do nome no registo: 30 consultas por origem em 10 minutos chegam para escrever
-- um nome à vontade e travam a recolha em massa de nomes.
create or replace function public.username_available(target_username text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform private.throttle('username_available', 30, interval '10 minutes');
  return public.normalize_username(target_username) is not null
    and not exists (
      select 1 from public.profiles
      where username = public.normalize_username(target_username)
    );
end;
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- Entrada com nome: além das 10 falhas por nome, 30 falhas por origem em 15 minutos (impede tentar
-- a mesma palavra-passe em muitos nomes).
create or replace function public.login_email(target_username text, target_password text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  name text := public.normalize_username(target_username);
  origin text := private.request_client();
  found_email text;
  stored_hash text;
begin
  if name is null or coalesce(target_password, '') = '' then
    return null;
  end if;

  delete from public.login_attempts where attempted_at < now() - interval '1 day';
  if (
    select count(*) from public.login_attempts
    where username = name and attempted_at > now() - interval '15 minutes'
  ) >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if origin is not null and (
    select count(*) from public.lookup_attempts
    where kind = 'login_failure' and client = origin
      and attempted_at > now() - interval '15 minutes'
  ) >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  select u.email, u.encrypted_password
  into found_email, stored_hash
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username = name;

  if found_email is not null
    and stored_hash is not null
    and extensions.crypt(target_password, stored_hash) = stored_hash
  then
    return found_email;
  end if;

  insert into public.login_attempts (username) values (name);
  if origin is not null then
    insert into public.lookup_attempts (kind, client) values ('login_failure', origin);
  end if;
  return null;
end;
$$;

revoke all on function public.login_email(text, text) from public;
grant execute on function public.login_email(text, text) to anon, authenticated;
