-- Endurecimento dos limites e bens vendidos ou pagos (ADR-048).
--
-- 1. `private.throttle` e `login_email` serializam a contagem por origem (e por nome) com um
--    bloqueio de transação: pedidos em simultâneo já não passam o limite por corrida.
-- 2. `wealth_items.closed_on`: dia em que um bem foi vendido ou uma dívida paga. O item sai dos
--    totais atuais mas conta no histórico até essa data. Sincroniza; apps anteriores não o apagam.

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
  perform pg_advisory_xact_lock(hashtextextended(p_kind || ':' || origin, 0));
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

revoke all on function private.throttle(text, int, interval) from public;

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

  -- Pedidos em simultâneo para o mesmo nome ou a mesma origem esperam uns pelos outros: a
  -- contagem e o registo da falha não podem ser ultrapassados por corrida.
  perform pg_advisory_xact_lock(hashtextextended('login_user:' || name, 0));
  if origin is not null then
    perform pg_advisory_xact_lock(hashtextextended('login_failure:' || origin, 0));
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

alter table public.wealth_items
  add column closed_on date
    check (closed_on is null or closed_on between date '1900-01-01' and date '2100-12-31');

create or replace function private.sync_apply_op(p_op jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_entity text := p_op ->> 'entity';
  v_id uuid := (p_op ->> 'record_id')::uuid;
  v_op_id uuid := (p_op ->> 'op_id')::uuid;
  v_base bigint := (p_op ->> 'base_version')::bigint;
  v_data jsonb := p_op -> 'data';
  v_current jsonb;
  v_row jsonb;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if v_id is null or v_op_id is null or v_base is null or v_base < 0 or v_data is null then
    raise exception 'invalid_operation' using errcode = 'CF422';
  end if;

  if v_entity = 'accounts' then
    select to_jsonb(t) into v_current from public.accounts t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'categories' then
    select to_jsonb(t) into v_current from public.categories t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'entries' then
    select to_jsonb(t) into v_current from public.entries t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'budgets' then
    select to_jsonb(t) into v_current from public.budgets t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'subscriptions' then
    select to_jsonb(t) into v_current from public.subscriptions t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'goals' then
    select to_jsonb(t) into v_current from public.goals t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'goal_contributions' then
    select to_jsonb(t) into v_current from public.goal_contributions t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'wealth_items' then
    select to_jsonb(t) into v_current from public.wealth_items t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'vehicles' then
    select to_jsonb(t) into v_current from public.vehicles t
     where t.user_id = v_user and t.id = v_id for update;
  elsif v_entity = 'documents' then
    select to_jsonb(t) into v_current from public.documents t
     where t.user_id = v_user and t.id = v_id for update;
  else
    raise exception 'invalid_entity' using errcode = 'CF422';
  end if;

  if v_current is not null and (v_current ->> 'last_op_id')::uuid = v_op_id then
    return jsonb_build_object('status', 'duplicate', 'row', v_current - 'user_id');
  end if;

  if v_current is null and v_base > 0 then
    return jsonb_build_object('status', 'conflict', 'reason', 'missing', 'row', null);
  end if;

  if v_current is not null and (v_current ->> 'version')::bigint <> v_base then
    return jsonb_build_object('status', 'conflict', 'reason', 'version', 'row', v_current - 'user_id');
  end if;

  if v_entity = 'accounts' then
    if v_current is null then
      insert into public.accounts as t
        (user_id, id, name, type, currency, initial_balance, archived_at, last_op_id, created_at,
         deleted_at)
      values
        (v_user, v_id, v_data ->> 'name', v_data ->> 'type', v_data ->> 'currency',
         (v_data ->> 'initial_balance')::bigint, (v_data ->> 'archived_at')::timestamptz, v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.accounts as t set
        name = v_data ->> 'name',
        type = v_data ->> 'type',
        currency = v_data ->> 'currency',
        initial_balance = (v_data ->> 'initial_balance')::bigint,
        archived_at = (v_data ->> 'archived_at')::timestamptz,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'categories' then
    if v_current is null then
      insert into public.categories as t
        (user_id, id, name, type, icon, color, system_key, essential, last_op_id, created_at,
         deleted_at)
      values
        (v_user, v_id, v_data ->> 'name', v_data ->> 'type', v_data ->> 'icon',
         v_data ->> 'color', v_data ->> 'system_key',
         coalesce((v_data ->> 'essential')::smallint, 0), v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.categories as t set
        name = v_data ->> 'name',
        type = v_data ->> 'type',
        icon = v_data ->> 'icon',
        color = v_data ->> 'color',
        system_key = v_data ->> 'system_key',
        -- Apps anteriores não enviam o campo: sem a chave, o valor guardado mantém-se.
        essential = case when v_data ? 'essential'
          then coalesce((v_data ->> 'essential')::smallint, 0) else t.essential end,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'entries' then
    if v_current is null then
      insert into public.entries as t
        (user_id, id, type, amount, description, notes, category_id, account_id,
         destination_account_id, date, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'type', (v_data ->> 'amount')::bigint,
         coalesce(v_data ->> 'description', ''), v_data ->> 'notes',
         (v_data ->> 'category_id')::uuid, (v_data ->> 'account_id')::uuid,
         (v_data ->> 'destination_account_id')::uuid, (v_data ->> 'date')::date, v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.entries as t set
        type = v_data ->> 'type',
        amount = (v_data ->> 'amount')::bigint,
        description = coalesce(v_data ->> 'description', ''),
        notes = v_data ->> 'notes',
        category_id = (v_data ->> 'category_id')::uuid,
        account_id = (v_data ->> 'account_id')::uuid,
        destination_account_id = (v_data ->> 'destination_account_id')::uuid,
        date = (v_data ->> 'date')::date,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'budgets' then
    if v_current is null then
      insert into public.budgets as t
        (user_id, id, category_id, amount, currency, period, starts_on, last_op_id, created_at,
         deleted_at)
      values
        (v_user, v_id, (v_data ->> 'category_id')::uuid, (v_data ->> 'amount')::bigint,
         v_data ->> 'currency', v_data ->> 'period', (v_data ->> 'starts_on')::date, v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.budgets as t set
        category_id = (v_data ->> 'category_id')::uuid,
        amount = (v_data ->> 'amount')::bigint,
        currency = v_data ->> 'currency',
        period = v_data ->> 'period',
        starts_on = (v_data ->> 'starts_on')::date,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'subscriptions' then
    if v_current is null then
      insert into public.subscriptions as t
        (user_id, id, name, amount, currency, period, status, starts_on, next_on, category_id,
         previous_amount, amount_changed_on, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'name', (v_data ->> 'amount')::bigint,
         v_data ->> 'currency', v_data ->> 'period', v_data ->> 'status',
         (v_data ->> 'starts_on')::date, (v_data ->> 'next_on')::date,
         (v_data ->> 'category_id')::uuid, (v_data ->> 'previous_amount')::bigint,
         (v_data ->> 'amount_changed_on')::date, v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.subscriptions as t set
        name = v_data ->> 'name',
        amount = (v_data ->> 'amount')::bigint,
        currency = v_data ->> 'currency',
        period = v_data ->> 'period',
        status = v_data ->> 'status',
        starts_on = (v_data ->> 'starts_on')::date,
        next_on = (v_data ->> 'next_on')::date,
        category_id = (v_data ->> 'category_id')::uuid,
        -- Apps anteriores não enviam estes campos: sem a chave, o valor guardado mantém-se.
        previous_amount = case when v_data ? 'previous_amount'
          then (v_data ->> 'previous_amount')::bigint else t.previous_amount end,
        amount_changed_on = case when v_data ? 'amount_changed_on'
          then (v_data ->> 'amount_changed_on')::date else t.amount_changed_on end,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'goals' then
    if v_current is null then
      insert into public.goals as t
        (user_id, id, name, target_amount, currency, target_on, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'name', (v_data ->> 'target_amount')::bigint,
         v_data ->> 'currency', (v_data ->> 'target_on')::date, v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.goals as t set
        name = v_data ->> 'name',
        target_amount = (v_data ->> 'target_amount')::bigint,
        currency = v_data ->> 'currency',
        target_on = (v_data ->> 'target_on')::date,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'goal_contributions' then
    if v_current is null then
      insert into public.goal_contributions as t
        (user_id, id, goal_id, amount, date, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, (v_data ->> 'goal_id')::uuid, (v_data ->> 'amount')::bigint,
         (v_data ->> 'date')::date, v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.goal_contributions as t set
        goal_id = (v_data ->> 'goal_id')::uuid,
        amount = (v_data ->> 'amount')::bigint,
        date = (v_data ->> 'date')::date,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'wealth_items' then
    if v_current is null then
      insert into public.wealth_items as t
        (user_id, id, name, type, amount, currency, valued_on, value_history, closed_on,
         last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'name', v_data ->> 'type', (v_data ->> 'amount')::bigint,
         v_data ->> 'currency', (v_data ->> 'valued_on')::date, v_data ->> 'value_history',
         (v_data ->> 'closed_on')::date, v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.wealth_items as t set
        name = v_data ->> 'name',
        type = v_data ->> 'type',
        amount = (v_data ->> 'amount')::bigint,
        currency = v_data ->> 'currency',
        valued_on = (v_data ->> 'valued_on')::date,
        value_history = case when v_data ? 'value_history'
          then v_data ->> 'value_history' else t.value_history end,
        closed_on = case when v_data ? 'closed_on'
          then (v_data ->> 'closed_on')::date else t.closed_on end,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'vehicles' then
    if v_current is null then
      insert into public.vehicles as t
        (user_id, id, name, kind, plate, odometer_km, inspection_due, insurance_due, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'name', v_data ->> 'kind', v_data ->> 'plate',
         (v_data ->> 'odometer_km')::bigint, (v_data ->> 'inspection_due')::date,
         (v_data ->> 'insurance_due')::date, v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.vehicles as t set
        name = v_data ->> 'name',
        kind = v_data ->> 'kind',
        plate = v_data ->> 'plate',
        odometer_km = (v_data ->> 'odometer_km')::bigint,
        inspection_due = (v_data ->> 'inspection_due')::date,
        insurance_due = (v_data ->> 'insurance_due')::date,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'documents' then
    if v_current is null then
      insert into public.documents as t
        (user_id, id, title, category, expires_on, notes, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'title', v_data ->> 'category',
         (v_data ->> 'expires_on')::date, v_data ->> 'notes', v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.documents as t set
        title = v_data ->> 'title',
        category = v_data ->> 'category',
        expires_on = (v_data ->> 'expires_on')::date,
        notes = v_data ->> 'notes',
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  else
    raise exception 'invalid_entity' using errcode = 'CF422';
  end if;

  return jsonb_build_object('status', 'applied', 'row', v_row - 'user_id');
end;
$$;
