-- Documentos com anexos, Fase 4 (ADR-056; desenho em docs/fase4-documentos.md).
--
-- 1. `documents.attachments`: metadados dos anexos em texto JSON (lista de até 10
--    `{id, name, mime, size, created_at}`); `acquired_on`, `amount` e `currency` para compras e
--    garantias. Os ficheiros não passam pela sincronização: ficam no Storage.
-- 2. Balde privado `documents` no Storage (10 MB por ficheiro; JPEG, PNG, WebP e PDF), com
--    políticas por utilizador: só a pasta `<user_id>/...` de cada pessoa.
-- 3. `private.sync_apply_op`: grava os campos novos com guardas `v_data ? 'campo'`.
--
-- Não aplicar sem autorização expressa (staging primeiro; produção depois).

alter table public.documents
  add column attachments text
    check (attachments is null or (
      json_typeof(attachments::json) = 'array' and json_array_length(attachments::json) <= 10
    )),
  add column acquired_on date
    check (acquired_on is null or acquired_on between date '1900-01-01' and date '2100-12-31'),
  add column amount bigint check (amount is null or (amount > 0 and amount <= 1000000000000)),
  add column currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  add constraint documents_amount_currency check (amount is null or currency is not null);

-- Storage: só onde existe (no Supabase; os testes em PGlite não têm o esquema `storage`).
do $storage$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('documents', 'documents', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
  on conflict (id) do update set
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  execute $policy$
    create policy "documents: read own files" on storage.objects
      for select to authenticated
      using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
  $policy$;
  execute $policy$
    create policy "documents: upload own files" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
  $policy$;
  execute $policy$
    create policy "documents: replace own files" on storage.objects
      for update to authenticated
      using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
      with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
  $policy$;
  execute $policy$
    create policy "documents: delete own files" on storage.objects
      for delete to authenticated
      using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
  $policy$;
end
$storage$;

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
         destination_account_id, date, vehicle_id, vehicle_cost_type, quantity_milli, odometer_km,
         last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'type', (v_data ->> 'amount')::bigint,
         coalesce(v_data ->> 'description', ''), v_data ->> 'notes',
         (v_data ->> 'category_id')::uuid, (v_data ->> 'account_id')::uuid,
         (v_data ->> 'destination_account_id')::uuid, (v_data ->> 'date')::date,
         (v_data ->> 'vehicle_id')::uuid, v_data ->> 'vehicle_cost_type',
         (v_data ->> 'quantity_milli')::bigint, (v_data ->> 'odometer_km')::bigint, v_op_id,
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
        -- Apps anteriores não enviam os campos do veículo: sem a chave, o valor guardado mantém-se.
        vehicle_id = case when v_data ? 'vehicle_id'
          then (v_data ->> 'vehicle_id')::uuid else t.vehicle_id end,
        vehicle_cost_type = case when v_data ? 'vehicle_cost_type'
          then v_data ->> 'vehicle_cost_type' else t.vehicle_cost_type end,
        quantity_milli = case when v_data ? 'quantity_milli'
          then (v_data ->> 'quantity_milli')::bigint else t.quantity_milli end,
        odometer_km = case when v_data ? 'odometer_km'
          then (v_data ->> 'odometer_km')::bigint else t.odometer_km end,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
    -- Uma só compra marcada por veículo (ADR-054): a segunda é recusada, não adivinhada.
    if v_row ->> 'vehicle_cost_type' = 'purchase' and v_row ->> 'deleted_at' is null
      and exists (
        select 1 from public.entries e
         where e.user_id = v_user and e.id <> v_id
           and e.vehicle_id = (v_row ->> 'vehicle_id')::uuid
           and e.vehicle_cost_type = 'purchase' and e.deleted_at is null
      ) then
      raise exception 'purchase_already_linked' using errcode = 'CF422';
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
        (user_id, id, name, kind, plate, odometer_km, inspection_due, insurance_due, make, model,
         year, fuel_type, acquired_on, purchase_amount, currency, road_tax_due, service_due_on,
         service_due_km, notes, kind_label, icon, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'name', v_data ->> 'kind', v_data ->> 'plate',
         (v_data ->> 'odometer_km')::bigint, (v_data ->> 'inspection_due')::date,
         (v_data ->> 'insurance_due')::date, v_data ->> 'make', v_data ->> 'model',
         (v_data ->> 'year')::int, v_data ->> 'fuel_type', (v_data ->> 'acquired_on')::date,
         (v_data ->> 'purchase_amount')::bigint, v_data ->> 'currency',
         (v_data ->> 'road_tax_due')::date, (v_data ->> 'service_due_on')::date,
         (v_data ->> 'service_due_km')::bigint, v_data ->> 'notes', v_data ->> 'kind_label',
         v_data ->> 'icon', v_op_id,
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
        -- Campos da Fase 1 dos veículos: apps anteriores não os enviam e não os apagam.
        make = case when v_data ? 'make'
          then (v_data ->> 'make') else t.make end,
        model = case when v_data ? 'model'
          then (v_data ->> 'model') else t.model end,
        year = case when v_data ? 'year'
          then (v_data ->> 'year')::int else t.year end,
        fuel_type = case when v_data ? 'fuel_type'
          then (v_data ->> 'fuel_type') else t.fuel_type end,
        acquired_on = case when v_data ? 'acquired_on'
          then (v_data ->> 'acquired_on')::date else t.acquired_on end,
        purchase_amount = case when v_data ? 'purchase_amount'
          then (v_data ->> 'purchase_amount')::bigint else t.purchase_amount end,
        currency = case when v_data ? 'currency'
          then (v_data ->> 'currency') else t.currency end,
        road_tax_due = case when v_data ? 'road_tax_due'
          then (v_data ->> 'road_tax_due')::date else t.road_tax_due end,
        service_due_on = case when v_data ? 'service_due_on'
          then (v_data ->> 'service_due_on')::date else t.service_due_on end,
        service_due_km = case when v_data ? 'service_due_km'
          then (v_data ->> 'service_due_km')::bigint else t.service_due_km end,
        notes = case when v_data ? 'notes'
          then (v_data ->> 'notes') else t.notes end,
        kind_label = case when v_data ? 'kind_label'
          then (v_data ->> 'kind_label') else t.kind_label end,
        icon = case when v_data ? 'icon'
          then (v_data ->> 'icon') else t.icon end,
        deleted_at = (v_data ->> 'deleted_at')::timestamptz,
        last_op_id = v_op_id,
        version = v_base
      where t.user_id = v_user and t.id = v_id
      returning to_jsonb(t) into v_row;
    end if;
  elsif v_entity = 'documents' then
    if v_current is null then
      insert into public.documents as t
        (user_id, id, title, category, expires_on, notes, vehicle_id, attachments, acquired_on,
         amount, currency, last_op_id, created_at, deleted_at)
      values
        (v_user, v_id, v_data ->> 'title', v_data ->> 'category',
         (v_data ->> 'expires_on')::date, v_data ->> 'notes', (v_data ->> 'vehicle_id')::uuid,
         v_data ->> 'attachments', (v_data ->> 'acquired_on')::date,
         (v_data ->> 'amount')::bigint, v_data ->> 'currency', v_op_id,
         coalesce((v_data ->> 'created_at')::timestamptz, now()),
         (v_data ->> 'deleted_at')::timestamptz)
      returning to_jsonb(t) into v_row;
    else
      update public.documents as t set
        title = v_data ->> 'title',
        category = v_data ->> 'category',
        expires_on = (v_data ->> 'expires_on')::date,
        notes = v_data ->> 'notes',
        vehicle_id = case when v_data ? 'vehicle_id'
          then (v_data ->> 'vehicle_id')::uuid else t.vehicle_id end,
        -- Anexos e compra (ADR-056): apps anteriores não os enviam e não os apagam.
        attachments = case when v_data ? 'attachments'
          then v_data ->> 'attachments' else t.attachments end,
        acquired_on = case when v_data ? 'acquired_on'
          then (v_data ->> 'acquired_on')::date else t.acquired_on end,
        amount = case when v_data ? 'amount'
          then (v_data ->> 'amount')::bigint else t.amount end,
        currency = case when v_data ? 'currency'
          then v_data ->> 'currency' else t.currency end,
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
