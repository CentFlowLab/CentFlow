-- Preço anterior das subscrições (ADR-041): a app guarda o valor antes de uma mudança de preço
-- para avisar quando uma subscrição sobe. Os dois campos sincronizam como os restantes.
-- `sync_apply_op` é a da migração 20261108000900 com estes campos nas subscrições; apps que ainda
-- não os enviam não os apagam.

alter table public.subscriptions
  add column previous_amount bigint check (previous_amount is null or previous_amount > 0),
  add column amount_changed_on date
    check (amount_changed_on is null or amount_changed_on between date '1900-01-01' and date '2100-12-31');

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
        (user_id, id, name, type, icon, color, system_key, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'name', v_data ->> 'type', v_data ->> 'icon',
         v_data ->> 'color', v_data ->> 'system_key', v_op_id,
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
        (user_id, id, name, type, amount, currency, valued_on, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'name', v_data ->> 'type', (v_data ->> 'amount')::bigint,
         v_data ->> 'currency', (v_data ->> 'valued_on')::date, v_op_id,
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
