-- CentFlow — protocolo de sincronização.
--
-- sync_push(ops):  aplica alterações do cliente por ordem, em grupos atómicos (`tx_id`), com
--                  compare-and-swap por versão e idempotência por `op_id`.
-- sync_pull(since): devolve as alterações com `server_seq` > since, por ordem.
-- sync_verify(records) / sync_counts(): confirmação de integridade (migração inicial).
-- purge_deleted(): limpeza definitiva de linhas eliminadas, só para o servidor.
--
-- Todas as funções acessíveis ao cliente são SECURITY INVOKER: o RLS aplica-se sempre.

-- Aplica uma operação. Devolve o estado sem lançar exceções para conflitos esperados.
create function public.sync_apply_op(p_op jsonb)
returns jsonb
language plpgsql
security invoker
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
  else
    raise exception 'invalid_entity' using errcode = 'CF422';
  end if;

  if v_current is not null and (v_current ->> 'last_op_id')::uuid = v_op_id then
    return jsonb_build_object('status', 'duplicate', 'row', v_current - 'user_id');
  end if;

  if v_current is null and v_base > 0 then
    -- A linha não existe (purgada ou nunca criada): nunca a recriar a partir de uma edição.
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
  else
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
  end if;

  return jsonb_build_object('status', 'applied', 'row', v_row - 'user_id');
end;
$$;

-- Aplica uma lista de operações por ordem. Operações com o mesmo `tx_id` (consecutivas) formam um
-- grupo atómico: um conflito ou uma violação de integridade desfaz o grupo inteiro.
create function public.sync_push(p_ops jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_results jsonb := '[]'::jsonb;
  v_count int;
  v_index int := 0;
  v_group_start int;
  v_group_tx text;
  v_group_results jsonb;
  v_failed_index int;
  v_failure jsonb;
  v_result jsonb;
  v_op jsonb;
  v_i int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if jsonb_typeof(p_ops) <> 'array' then
    raise exception 'invalid_operation' using errcode = 'CF422';
  end if;
  v_count := jsonb_array_length(p_ops);
  if v_count > 500 then
    raise exception 'too_many_operations' using errcode = 'CF422';
  end if;

  while v_index < v_count loop
    v_group_start := v_index;
    v_group_tx := p_ops -> v_index ->> 'tx_id';
    v_group_results := '[]'::jsonb;
    v_failed_index := null;
    v_failure := null;

    begin
      loop
        v_op := p_ops -> v_index;
        v_failed_index := v_index;
        v_result := public.sync_apply_op(v_op);
        if v_result ->> 'status' = 'conflict' then
          v_failure := v_result;
          raise exception 'group_conflict' using errcode = 'CF409';
        end if;
        v_group_results := v_group_results
          || jsonb_build_array(v_result || jsonb_build_object('op_id', v_op ->> 'op_id'));
        v_index := v_index + 1;
        exit when v_index >= v_count
          or (p_ops -> v_index ->> 'tx_id') is distinct from v_group_tx
          or v_group_tx is null;
      end loop;
      v_failed_index := null;
    exception
      when sqlstate 'CF409' then
        if v_failure is null then
          v_failure := jsonb_build_object('status', 'conflict', 'reason', 'version', 'row', null);
        end if;
      when sqlstate 'CF422' or check_violation or foreign_key_violation or not_null_violation
        or invalid_text_representation or datetime_field_overflow or invalid_datetime_format
        or numeric_value_out_of_range or string_data_right_truncation then
        v_failure := jsonb_build_object(
          'status', 'rejected', 'reason', sqlerrm, 'code', sqlstate);
    end;

    if v_failed_index is not null then
      -- Desfeito: a operação que falhou recebe o motivo; as restantes do grupo são abortadas.
      v_group_results := '[]'::jsonb;
      v_index := v_group_start;
      loop
        v_op := p_ops -> v_index;
        if v_index = v_failed_index then
          v_group_results := v_group_results
            || jsonb_build_array(v_failure || jsonb_build_object('op_id', v_op ->> 'op_id'));
        else
          v_group_results := v_group_results || jsonb_build_array(jsonb_build_object(
            'op_id', v_op ->> 'op_id', 'status', 'aborted'));
        end if;
        v_index := v_index + 1;
        exit when v_index >= v_count
          or (p_ops -> v_index ->> 'tx_id') is distinct from v_group_tx
          or v_group_tx is null;
      end loop;
    end if;

    v_results := v_results || v_group_results;
  end loop;

  return jsonb_build_object('results', v_results);
end;
$$;

-- Alterações posteriores a `p_since`, por ordem de `server_seq`.
create function public.sync_pull(p_since bigint, p_limit int default 500)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_meta record;
  v_changes jsonb;
  v_limit int := least(greatest(coalesce(p_limit, 500), 1), 1000);
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select last_seq, purged_through_seq into v_meta
    from public.sync_metadata where user_id = v_user;
  if not found then
    raise exception 'sync_metadata_missing' using errcode = 'CF422';
  end if;
  if p_since > 0 and p_since < v_meta.purged_through_seq then
    return jsonb_build_object('reset_required', true, 'last_seq', v_meta.last_seq);
  end if;

  select coalesce(jsonb_agg(c order by (c ->> 'server_seq')::bigint), '[]'::jsonb)
    into v_changes
    from (
      select jsonb_build_object('entity', entity, 'server_seq', server_seq, 'row', payload) as c
        from (
          select 'accounts' as entity, t.server_seq, to_jsonb(t) - 'user_id' as payload
            from public.accounts t where t.user_id = v_user and t.server_seq > p_since
          union all
          select 'categories', t.server_seq, to_jsonb(t) - 'user_id'
            from public.categories t where t.user_id = v_user and t.server_seq > p_since
          union all
          select 'entries', t.server_seq, to_jsonb(t) - 'user_id'
            from public.entries t where t.user_id = v_user and t.server_seq > p_since
          order by 2
          limit v_limit
        ) ordered
    ) batch;

  return jsonb_build_object(
    'reset_required', false,
    'changes', v_changes,
    'has_more', jsonb_array_length(v_changes) = v_limit,
    'last_seq', v_meta.last_seq);
end;
$$;

-- Estado no servidor de um conjunto de registos (confirmação de migração).
create function public.sync_verify(p_records jsonb)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'entity', r.entity,
    'id', r.id,
    'version', coalesce(a.version, c.version, e.version),
    'deleted', coalesce(a.deleted_at, c.deleted_at, e.deleted_at) is not null
  )), '[]'::jsonb)
  from jsonb_to_recordset(p_records) as r(entity text, id uuid)
  left join public.accounts a
    on r.entity = 'accounts' and a.user_id = auth.uid() and a.id = r.id
  left join public.categories c
    on r.entity = 'categories' and c.user_id = auth.uid() and c.id = r.id
  left join public.entries e
    on r.entity = 'entries' and e.user_id = auth.uid() and e.id = r.id;
$$;

-- Contagens por entidade (ativas e eliminadas) para comparar com a cópia local.
create function public.sync_counts()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'accounts', (select jsonb_build_object(
      'live', count(*) filter (where deleted_at is null),
      'deleted', count(*) filter (where deleted_at is not null))
      from public.accounts where user_id = auth.uid()),
    'categories', (select jsonb_build_object(
      'live', count(*) filter (where deleted_at is null),
      'deleted', count(*) filter (where deleted_at is not null))
      from public.categories where user_id = auth.uid()),
    'entries', (select jsonb_build_object(
      'live', count(*) filter (where deleted_at is null),
      'deleted', count(*) filter (where deleted_at is not null))
      from public.entries where user_id = auth.uid()),
    'last_seq', (select last_seq from public.sync_metadata where user_id = auth.uid()));
$$;

-- Limpeza definitiva de linhas eliminadas há mais de `p_retention`. Só para o servidor (cron ou
-- service role). Clientes com cursor anterior à última sequência purgada fazem ressincronização.
create function public.purge_deleted(p_retention interval default interval '180 days')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff timestamptz := now() - p_retention;
  v_entries int;
  v_categories int;
  v_accounts int;
begin
  if p_retention < interval '30 days' then
    raise exception 'retention_too_short' using errcode = 'CF422';
  end if;

  create temporary table purged (user_id uuid, server_seq bigint) on commit drop;

  with d as (
    delete from public.entries where deleted_at < v_cutoff returning user_id, server_seq
  ) insert into purged select * from d;
  get diagnostics v_entries = row_count;

  with d as (
    delete from public.categories c
     where c.deleted_at < v_cutoff
       and not exists (select 1 from public.entries e
                        where e.user_id = c.user_id and e.category_id = c.id)
    returning user_id, server_seq
  ) insert into purged select * from d;
  get diagnostics v_categories = row_count;

  with d as (
    delete from public.accounts a
     where a.deleted_at < v_cutoff
       and not exists (select 1 from public.entries e
                        where e.user_id = a.user_id
                          and (e.account_id = a.id or e.destination_account_id = a.id))
    returning user_id, server_seq
  ) insert into purged select * from d;
  get diagnostics v_accounts = row_count;

  update public.sync_metadata m
     set purged_through_seq = greatest(m.purged_through_seq, p.max_seq), updated_at = now()
    from (select user_id, max(server_seq) as max_seq from purged group by user_id) p
   where m.user_id = p.user_id;

  return jsonb_build_object(
    'entries', v_entries, 'categories', v_categories, 'accounts', v_accounts);
end;
$$;

revoke all on function public.sync_apply_op(jsonb) from public, anon, authenticated;
revoke all on function public.sync_push(jsonb) from public, anon;
revoke all on function public.sync_pull(bigint, int) from public, anon;
revoke all on function public.sync_verify(jsonb) from public, anon;
revoke all on function public.sync_counts() from public, anon;
revoke all on function public.purge_deleted(interval) from public, anon, authenticated;

grant execute on function public.sync_apply_op(jsonb) to authenticated;
grant execute on function public.sync_push(jsonb) to authenticated;
grant execute on function public.sync_pull(bigint, int) to authenticated;
grant execute on function public.sync_verify(jsonb) to authenticated;
grant execute on function public.sync_counts() to authenticated;
