-- Nome escolhido no registo e distinção entre conta inexistente e palavra-passe errada.
-- O GoTrue responde `invalid_credentials` nos dois casos. `email_registered` só diz se o email
-- tem conta, para o ecrã de entrar mostrar a frase certa. Não regista o email.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen text;
begin
  chosen := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')), '');
  if chosen is not null then
    chosen := left(chosen, 40);
  end if;
  insert into public.profiles (id, display_name)
  values (new.id, chosen)
  on conflict (id) do nothing;
  insert into public.sync_metadata (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create function public.email_registered(target_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where auth.users.email is not null
      and lower(auth.users.email) = lower(btrim(target_email))
  );
$$;

revoke all on function public.email_registered(text) from public;
grant execute on function public.email_registered(text) to anon, authenticated;
