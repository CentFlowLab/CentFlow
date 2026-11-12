-- Painel de administração (ADR-065): só agregados, nunca dados financeiros individuais.
--
-- 1. `private.admin_roles`: quem administra e com que papel (technical, support, product).
--    Gerido só por SQL pelo responsável (nenhuma função da app dá ou tira papéis).
-- 2. `private.admin_audit`: cada consulta administrativa fica registada (quem, o quê, quando).
-- 3. `public.admin_role()`: o papel da própria sessão (ou null) — a app só mostra o painel a quem
--    o servidor reconhece; esconder um botão não é a proteção.
-- 4. `public.admin_overview()`: contagens agregadas. Nenhuma linha de movimentos, saldos,
--    documentos, nomes ou emails sai daqui. Não contorna RLS para mais nada.
-- 5. `public.admin_audit_log()`: só o papel `technical` consulta o registo.
-- Acesso de suporte a dados de uma pessoa: não existe (proposta em docs/admin.md).
--
-- Não aplicar sem autorização expressa (staging primeiro; produção depois).

create table private.admin_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('technical', 'support', 'product')),
  granted_at timestamptz not null default now(),
  note text check (note is null or char_length(note) <= 200)
);

create table private.admin_audit (
  id bigint generated always as identity primary key,
  admin_id uuid not null,
  role text not null,
  action text not null check (char_length(action) <= 60),
  at timestamptz not null default now()
);

alter table private.admin_roles enable row level security;
alter table private.admin_audit enable row level security;
revoke all on private.admin_roles, private.admin_audit from anon, authenticated;

create function public.admin_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select r.role from private.admin_roles r where r.user_id = (select auth.uid());
$$;

create function private.admin_require(p_action text, p_roles text[])
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select r.role into v_role from private.admin_roles r where r.user_id = (select auth.uid());
  if v_role is null or not (v_role = any (p_roles)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into private.admin_audit (admin_id, role, action) values ((select auth.uid()), v_role, p_action);
  return v_role;
end;
$$;

create function public.admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.admin_require('overview', array['technical', 'support', 'product']);
  return jsonb_build_object(
    'generatedAt', now(),
    'users', jsonb_build_object(
      'total', (select count(*) from auth.users),
      'new30d', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
      'syncing7d', (select count(*) from public.sync_metadata where updated_at > now() - interval '7 days')
    ),
    'records', jsonb_build_object(
      'accounts', (select count(*) from public.accounts where deleted_at is null),
      'entries', (select count(*) from public.entries where deleted_at is null),
      'documents', (select count(*) from public.documents where deleted_at is null),
      'goals', (select count(*) from public.goals where deleted_at is null)
    ),
    'integrations', coalesce(
      (select jsonb_object_agg(status, total) from (
        select status, count(*) as total from public.integrations group by status) s),
      '{}'::jsonb
    )
  );
end;
$$;

create function public.admin_audit_log(p_limit int default 50)
returns table (admin_id uuid, role text, action text, at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.admin_require('audit_log', array['technical']);
  return query
    select a.admin_id, a.role, a.action, a.at from private.admin_audit a
     order by a.at desc, a.id desc
     limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

revoke all on function public.admin_role() from public, anon;
revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_audit_log(int) from public, anon;
revoke all on function private.admin_require(text, text[]) from public, anon, authenticated;
grant execute on function public.admin_role() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_audit_log(int) to authenticated;
