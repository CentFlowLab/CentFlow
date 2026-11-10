-- Nome de utilizador único e data de nascimento no registo; entrar com o nome ou com o email.
--
-- - `profiles.username`: minúsculas, algarismos, ponto e sublinhado (3 a 24). Único.
-- - `profiles.birth_date`: pedida no registo (idade mínima verificada na app e aqui).
-- - `username_available(nome)`: o registo avisa antes de enviar o email de confirmação.
-- - `login_email(nome, palavra-passe)`: devolve o email da conta SÓ se a palavra-passe estiver
--   certa (bcrypt de `auth.users`). Sem a palavra-passe, ninguém obtém o email de um nome.
--   Dez falhas em quinze minutos bloqueiam o nome durante esse período.

alter table public.profiles
  add column username text,
  add column birth_date date,
  add constraint profiles_username_format check (
    username is null or username ~ '^[a-z0-9._]{3,24}$'
  ),
  add constraint profiles_birth_date_range check (
    birth_date is null or (birth_date >= date '1900-01-01' and birth_date <= current_date)
  );

create unique index profiles_username_key on public.profiles (username);

create function public.normalize_username(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when lower(btrim(coalesce(value, ''))) ~ '^[a-z0-9._]{3,24}$' then lower(btrim(value))
    else null
  end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_name text;
  birth text;
begin
  raw_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')), '');
  birth := new.raw_user_meta_data ->> 'birth_date';
  insert into public.profiles (id, display_name, username, birth_date)
  values (
    new.id,
    left(raw_name, 40),
    public.normalize_username(raw_name),
    case
      when birth ~ '^\d{4}-\d{2}-\d{2}$'
        and birth::date between date '1900-01-01' and current_date
      then birth::date
      else null
    end
  )
  on conflict (id) do nothing;
  insert into public.sync_metadata (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create function public.username_available(target_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.normalize_username(target_username) is not null
    and not exists (
      select 1 from public.profiles
      where username = public.normalize_username(target_username)
    );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- Falhas recentes por nome. Sem políticas: só as funções abaixo lhe tocam.
create table public.login_attempts (
  username text not null,
  attempted_at timestamptz not null default now()
);

create index login_attempts_username_time on public.login_attempts (username, attempted_at);

alter table public.login_attempts enable row level security;
revoke all on table public.login_attempts from anon, authenticated;

create function public.login_email(target_username text, target_password text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  name text := public.normalize_username(target_username);
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
  return null;
end;
$$;

revoke all on function public.login_email(text, text) from public;
grant execute on function public.login_email(text, text) to anon, authenticated;
